import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  prepareUserSession,
  fetchProgressSummary as fetchProgressSummaryService,
  fetchLearnedWordSummaries,
  getOrCreateTodayWords,
  fetchAndCommitTodaySelection,
  markWordReviewed,
  markWordAsNew as markWordAsNewService,
  getModeForSeverity,
  getCountForSeverity,
  type TodaySelectionState,
} from '@/services/learningProgressService';
import type { DailySelection, SeverityLevel } from '@/types/learning';
import type { TodayWord } from '@/types/vocabulary';
import { getLocalPreferences, saveLocalPreferences } from '@/lib/preferences/localPreferences';
import { USER_KEY_EVENT_NAME, type UserKeyEventDetail } from '@/lib/userKeyEvents';
import { bootstrapLearnedFromServerByKey } from '@/lib/progress/srsSyncByUserKey';
import {
  type DerivedProgressSummary,
  type LearnedWordSummary,
  type TodayLearnedWordSummary,
} from '@/lib/progress/learnedWordStats';
import { buildTodaysWords } from '@/utils/todayWords';
import { identifyUser, trackReviewDue, trackWordLearned } from '@/services/analyticsService';
import { getNicknameLocal } from '@/lib/nickname';
import { formatDateKey } from '@/utils/dateKey';
import {
  DAILY_SELECTION_KEY,
  LAST_SELECTION_DATE_KEY,
  TODAY_DATE_KEY,
  TODAY_SELECTION_KEY,
  TODAY_WORDS_KEY,
} from '@/utils/storageKeys';

const DEFAULT_STATS = {
  total: 0,
  learning: 0,
  new: 0,
  due: 0,
  learned: 0
};

function toStats(summary: DerivedProgressSummary | null): typeof DEFAULT_STATS {
  if (!summary) return DEFAULT_STATS;
  const total = summary.total ?? summary.learned + summary.learning + summary.remaining;
  return {
    total,
    learning: summary.learning,
    new: summary.new,
    due: summary.due,
    learned: summary.learned
  };
}

export const useLearningProgress = () => {
  const [userKey, setUserKey] = useState<string | null>(null);
  const [severity, setSeverity] = useState<SeverityLevel>('light');
  const [category] = useState<string | null>(null);
  const [dailySelection, setDailySelection] = useState<DailySelection | null>(null);
  const [todayWords, setTodayWords] = useState<TodayWord[]>([]);
  const [progressStats, setProgressStats] = useState(DEFAULT_STATS);
  const learnedCountRef = useRef<number | null>(null);
  const [learnedWords, setLearnedWords] = useState<LearnedWordSummary[]>([]);
  const [newTodayLearnedWords, setNewTodayLearnedWords] = useState<TodayLearnedWordSummary[]>([]);
  const [dueTodayLearnedWords, setDueTodayLearnedWords] = useState<TodayLearnedWordSummary[]>([]);
  const [isDailySelectionLoading, setIsDailySelectionLoading] = useState(true);
  const dueEventTrackerRef = useRef<Set<string>>(new Set());
  const identifiedKeyRef = useRef<string | null>(null);

  const applyLearnedOverride = useCallback(
    (summary: DerivedProgressSummary | null) => {
      const stats = toStats(summary);
      if (!summary) {
        const learnedOverride = learnedCountRef.current;
        if (learnedOverride == null) {
          return stats;
        }
        return {
          ...stats,
          learned: learnedOverride,
          total: learnedOverride + stats.learning + Math.max(stats.total - stats.learning - learnedOverride, 0),
        };
      }

      if (summary.source === 'server') {
        return stats;
      }

      const learnedOverride = learnedCountRef.current;
      if (learnedOverride == null) {
        return stats;
      }

      const total =
        learnedOverride + stats.learning + Math.max(stats.total - stats.learning - learnedOverride, 0);

      return {
        ...stats,
        learned: learnedOverride,
        total,
      };
    },
    []
  );

  const refreshStats = useCallback(async (key?: string) => {
    const targetKey = key ?? userKey;
    if (!targetKey) return;
    try {
      const summary = await fetchProgressSummaryService(targetKey);
      if (summary?.source === 'server') {
        learnedCountRef.current = null;
      }
      setProgressStats(applyLearnedOverride(summary));
    } catch (error) {
      console.warn('[useLearningProgress] Failed to load progress summary', error);
      setProgressStats(applyLearnedOverride(null));
    }
  }, [applyLearnedOverride, userKey]);

  const refreshLearnedWords = useCallback(async (key?: string) => {
    const targetKey = key ?? userKey;
    if (!targetKey) return;
    try {
      const { learnedWords: learned, newTodayWords, dueTodayWords, summary } = await fetchLearnedWordSummaries(targetKey);
      learnedCountRef.current = summary?.source === 'server' ? null : learned.length;
      setLearnedWords(learned);
      setNewTodayLearnedWords(newTodayWords);
      setDueTodayLearnedWords(dueTodayWords);
      setProgressStats(applyLearnedOverride(summary));
    } catch (error) {
      console.warn('[useLearningProgress] Failed to load learned words', error);
      setLearnedWords([]);
      setNewTodayLearnedWords([]);
      setDueTodayLearnedWords([]);
    }
  }, [applyLearnedOverride, userKey]);

  useEffect(() => {
    if (!userKey) return;
    if (identifiedKeyRef.current === userKey) return;

    identifiedKeyRef.current = userKey;
    const nickname = getNicknameLocal();
    identifyUser(userKey, nickname);
  }, [userKey]);

  useEffect(() => {
    let isMounted = true;

    const handleUserKeyChange = (event: Event) => {
      if (!isMounted) return;
      const detail = (event as CustomEvent<UserKeyEventDetail>).detail;
      const nextKey = typeof detail?.userKey === 'string' && detail.userKey.trim().length ? detail.userKey : null;

      if (nextKey) {
        if (nextKey === userKey) {
          return;
        }
        learnedCountRef.current = null;
        setDailySelection(null);
        setTodayWords([]);
        setLearnedWords([]);
        setNewTodayLearnedWords([]);
        setDueTodayLearnedWords([]);
        setProgressStats(applyLearnedOverride(null));
        setIsDailySelectionLoading(true);
        setUserKey(nextKey);
        return;
      }

      learnedCountRef.current = null;
      setUserKey(null);
      setDailySelection(null);
      setTodayWords([]);
      setLearnedWords([]);
      setNewTodayLearnedWords([]);
      setDueTodayLearnedWords([]);
      setProgressStats(applyLearnedOverride(null));
      setIsDailySelectionLoading(false);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(USER_KEY_EVENT_NAME, handleUserKeyChange as EventListener);
    }

    const prepare = async () => {
      try {
        const preparedKey = await prepareUserSession();
        if (!isMounted) return;
        if (process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
          console.log('[useLearningProgress] prepareUserSession resolved', { userKey: preparedKey });
        }
        if (preparedKey) {
          setUserKey(preparedKey);
        } else {
          setIsDailySelectionLoading(false);
        }
      } catch (error) {
        if (!isMounted) return;
        console.warn('[useLearningProgress] prepareUserSession failed', error);
        setIsDailySelectionLoading(false);
      }
    };

    void prepare();

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener(USER_KEY_EVENT_NAME, handleUserKeyChange as EventListener);
      }
    };
  }, [applyLearnedOverride, userKey]);

  useEffect(() => {
    if (!userKey) return;

    let isActive = true;

    const initForUser = async () => {
      setIsDailySelectionLoading(true);
      try {
        await bootstrapLearnedFromServerByKey();

        let preferredSeverity: SeverityLevel = 'light';
        try {
          const prefs = await getLocalPreferences();
          const stored = (prefs.daily_option as SeverityLevel) || 'light';
          preferredSeverity = stored;
          if (!prefs.daily_option) {
            await saveLocalPreferences({ daily_option: stored });
          }
        } catch {
          // ignore preference errors
        }
        if (!isActive) return;
        setSeverity(preferredSeverity);

        const mode = getModeForSeverity(preferredSeverity);
        const count = getCountForSeverity(preferredSeverity);

        try {
          const result = await getOrCreateTodayWords(userKey, mode, count, category ?? null);
          if (!isActive) return;
          setDailySelection(result.selection);
          setTodayWords(result.words);
          if (process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
            console.log('[useLearningProgress] setTodayWords from init', {
              words: result.words.map(word => ({ word_id: word.word_id, word: word.word, category: word.category })),
            });
          }
        } catch (error) {
          if (!isActive) return;
          console.warn('[useLearningProgress] Failed to load today\'s words', error);
          setDailySelection(null);
          setTodayWords([]);
        }
      } catch (error) {
        if (!isActive) return;
        console.warn('[useLearningProgress] Failed to initialize learning progress', error);
        setDailySelection(null);
        setTodayWords([]);
      } finally {
        if (isActive) {
          setIsDailySelectionLoading(false);
        }
      }

      await refreshStats(userKey);
      if (!isActive) return;
      await refreshLearnedWords(userKey);
    };

    void initForUser();

    return () => {
      isActive = false;
    };
  }, [category, refreshLearnedWords, refreshStats, userKey]);

  const generateDailyWords = useCallback(
    async (level: SeverityLevel = 'light') => {
      if (!userKey) return;
      try {
        const mode = getModeForSeverity(level);
        const count = getCountForSeverity(level);
        setIsDailySelectionLoading(true);
        const result = await fetchAndCommitTodaySelection({
          userKey,
          mode,
          count,
          category: category ?? null,
        });
        setSeverity(level);
        setDailySelection(result.selection);
        setTodayWords(result.words);
        if (process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
          console.log('[useLearningProgress] setTodayWords from generateDailyWords', {
            words: result.words.map(word => ({ word_id: word.word_id, word: word.word, category: word.category })),
          });
        }
        await saveLocalPreferences({ daily_option: level });
        void refreshStats(userKey);
      } catch (error) {
        console.warn('[useLearningProgress] Failed to regenerate daily words', error);
      } finally {
        setIsDailySelectionLoading(false);
      }
    },
    [category, userKey, refreshStats]
  );

  const regenerateToday = useCallback(async () => {
    if (!userKey) return;
    const mode = getModeForSeverity(severity);
    const count = getCountForSeverity(severity);
    try {
      setIsDailySelectionLoading(true);
      const result = await fetchAndCommitTodaySelection({
        userKey,
        mode,
        count,
        category: category ?? null,
      });
      setDailySelection(result.selection);
      setTodayWords(result.words);
      if (process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
        console.log('[useLearningProgress] setTodayWords from regenerateToday', {
          words: result.words.map(word => ({ word_id: word.word_id, word: word.word, category: word.category })),
        });
      }
      void refreshStats(userKey);
    } catch (error) {
      console.warn('[useLearningProgress] Failed to regenerate today\'s selection', error);
    } finally {
      setIsDailySelectionLoading(false);
    }
  }, [category, refreshStats, severity, userKey]);

  const markWordAsPlayed = useCallback((word: string) => {
    const nowIso = new Date().toISOString();
    setTodayWords(prev => {
      const index = prev.findIndex(w => w.word === word);
      if (index === -1) return prev;
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        srs: {
          ...updated[index].srs,
          last_seen_at: nowIso
        }
      };
      return updated;
    });
  }, []);

  useEffect(() => {
    dueEventTrackerRef.current.clear();
  }, [dailySelection?.date, userKey]);

  useEffect(() => {
    if (!userKey) return;

    const tracker = dueEventTrackerRef.current;
    todayWords.forEach((word) => {
      if (!word.is_due) return;

      const trackerKey = `${word.word_id}:${word.nextAllowedTime ?? ''}`;
      if (tracker.has(trackerKey)) return;

      tracker.add(trackerKey);
      trackReviewDue(userKey, {
        wordId: word.word_id,
        category: word.category,
        srsIntervalDays: word.srs?.srs_interval_days ?? null,
      });
    });
  }, [todayWords, userKey]);

  const buildCurrentTodayState = useCallback((): TodaySelectionState | null => {
    if (!dailySelection) return null;
    const timezone = dailySelection.timezone ?? null;
    const date = dailySelection.date ?? formatDateKey(new Date(), timezone);
    const resolvedMode = dailySelection.mode ?? getModeForSeverity(severity);
    const resolvedCount = dailySelection.count ?? getCountForSeverity(severity);
    const resolvedCategory = dailySelection.category ?? category ?? null;

    return {
      date,
      mode: resolvedMode,
      count: resolvedCount,
      category: resolvedCategory,
      timezone,
      words: todayWords,
      selection: {
        ...dailySelection,
        date,
        mode: resolvedMode,
        count: resolvedCount,
        category: resolvedCategory,
        timezone,
      },
    };
  }, [category, dailySelection, severity, todayWords]);

  const markWordLearned = useCallback(
    async (word: string) => {
      if (!userKey) return;
      const target = todayWords.find(entry => entry.word === word);
      if (!target) return;
      const currentState = buildCurrentTodayState();
      if (!currentState) return;
      try {
        const result = await markWordReviewed(userKey, target.word_id, severity, currentState);
        setDailySelection(result.selection);
        setTodayWords(result.words);
        trackWordLearned(userKey, {
          wordId: target.word_id,
          category: target.category,
          srsState: result.payload?.srs_state ?? target.srs?.srs_state ?? null,
          srsIntervalDays: result.payload?.srs_interval_days ?? target.srs?.srs_interval_days ?? null,
        });
        if (result.summary?.source === 'server') {
          learnedCountRef.current = null;
        }
        if (result.learnedWords) {
          if (result.summary?.source !== 'server') {
            learnedCountRef.current = result.learnedWords.length;
          }
          setLearnedWords(result.learnedWords);
        }
        if (result.newTodayWords) {
          setNewTodayLearnedWords(result.newTodayWords);
        } else {
          setNewTodayLearnedWords([]);
        }
        if (result.dueTodayWords) {
          setDueTodayLearnedWords(result.dueTodayWords);
        } else {
          setDueTodayLearnedWords([]);
        }
        if (!result.learnedWords || !result.newTodayWords || !result.dueTodayWords) {
          void refreshLearnedWords(userKey);
        }
        if (result.summary) {
          setProgressStats(applyLearnedOverride(result.summary));
        } else {
          void refreshStats(userKey);
        }
      } catch (error) {
        console.warn('[useLearningProgress] Failed to mark word learned', error);
      }
    },
    [
      applyLearnedOverride,
      buildCurrentTodayState,
      refreshLearnedWords,
      refreshStats,
      severity,
      todayWords,
      userKey,
    ]
  );

  const markWordAsNew = useCallback(
    async (wordId: string) => {
      if (!userKey || !wordId) return false;
      try {
        const result = await markWordAsNewService(userKey, wordId);
        if (!result) {
          await refreshLearnedWords(userKey);
          await refreshStats(userKey);
          return false;
        }

        learnedCountRef.current = result.summary.source === 'server' ? null : result.learnedWords.length;
        setLearnedWords(result.learnedWords);
        setNewTodayLearnedWords(result.newTodayWords);
        setDueTodayLearnedWords(result.dueTodayWords);
        setProgressStats(applyLearnedOverride(result.summary));
        return true;
      } catch (error) {
        console.warn('[useLearningProgress] Failed to reset word', error);
        await refreshLearnedWords(userKey);
        await refreshStats(userKey);
        return false;
      }
    },
    [applyLearnedOverride, refreshLearnedWords, refreshStats, userKey]
  );

  const orderedTodayWords = useMemo(() => buildTodaysWords(todayWords, 'ALL'), [todayWords]);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;

    if (!dailySelection) {
      try {
        localStorage.removeItem(DAILY_SELECTION_KEY);
        localStorage.removeItem(TODAY_SELECTION_KEY);
        localStorage.removeItem(TODAY_WORDS_KEY);
        localStorage.removeItem(TODAY_DATE_KEY);
      } catch (error) {
        console.warn('[useLearningProgress] Failed to clear today selection cache', error);
      }
      return;
    }

    const dateKey = dailySelection.date ?? formatDateKey(new Date(), dailySelection.timezone ?? null);

    try {
      const serialisedSelection = JSON.stringify(dailySelection);
      localStorage.setItem(DAILY_SELECTION_KEY, serialisedSelection);
      localStorage.setItem(TODAY_SELECTION_KEY, serialisedSelection);
      localStorage.setItem(TODAY_WORDS_KEY, JSON.stringify(orderedTodayWords));
      localStorage.setItem(LAST_SELECTION_DATE_KEY, dateKey);
      localStorage.setItem(TODAY_DATE_KEY, dateKey);
    } catch (error) {
      console.warn('[useLearningProgress] Failed to persist today selection cache', error);
    }
  }, [dailySelection, orderedTodayWords]);

  return {
    dailySelection,
    progressStats,
    generateDailyWords,
    regenerateToday,
    markWordAsPlayed,
    refreshStats,
    refreshLearnedWords,
    learnedWords,
    newTodayLearnedWords,
    dueTodayLearnedWords,
    markWordLearned,
    markWordAsNew,
    todayWords: orderedTodayWords,
    isDailySelectionLoading,
  };
};
