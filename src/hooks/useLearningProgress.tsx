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
import { bootstrapLearnedFromServerByKey } from '@/lib/progress/srsSyncByUserKey';
import {
  type DerivedProgressSummary,
  type LearnedWordSummary,
  type TodayLearnedWordSummary,
} from '@/lib/progress/learnedWordStats';
import { buildTodaysWords } from '@/utils/todayWords';

const DEFAULT_STATS = {
  total: 0,
  learning: 0,
  new: 0,
  due: 0,
  learned: 0
};

function toStats(summary: DerivedProgressSummary | null): typeof DEFAULT_STATS {
  if (!summary) return DEFAULT_STATS;
  const total = summary.learned + summary.learning + summary.remaining;
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

  const applyLearnedOverride = useCallback(
    (stats: typeof DEFAULT_STATS) => {
      const learnedOverride = learnedCountRef.current;
      if (learnedOverride == null) {
        return stats;
      }
      return {
        ...stats,
        learned: learnedOverride,
        total: learnedOverride + stats.learning + Math.max(stats.total - stats.learning - learnedOverride, 0),
      };
    },
    []
  );

  const refreshStats = useCallback(async (key?: string) => {
    const targetKey = key ?? userKey;
    if (!targetKey) return;
    try {
      const summary = await fetchProgressSummaryService(targetKey);
      setProgressStats(applyLearnedOverride(toStats(summary)));
    } catch (error) {
      console.warn('[useLearningProgress] Failed to load progress summary', error);
      setProgressStats(applyLearnedOverride(DEFAULT_STATS));
    }
  }, [applyLearnedOverride, userKey]);

  const refreshLearnedWords = useCallback(async (key?: string) => {
    const targetKey = key ?? userKey;
    if (!targetKey) return;
    try {
      const { learnedWords: learned, newTodayWords, dueTodayWords, summary } = await fetchLearnedWordSummaries(targetKey);
      learnedCountRef.current = learned.length;
      setLearnedWords(learned);
      setNewTodayLearnedWords(newTodayWords);
      setDueTodayLearnedWords(dueTodayWords);
      setProgressStats(applyLearnedOverride(toStats(summary)));
    } catch (error) {
      console.warn('[useLearningProgress] Failed to load learned words', error);
      setLearnedWords([]);
      setNewTodayLearnedWords([]);
      setDueTodayLearnedWords([]);
    }
  }, [userKey]);

  useEffect(() => {
    let isActive = true;
    const init = async () => {
      const preparedKey = await prepareUserSession();
      if (!preparedKey || !isActive) return;
      if (process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
        console.log('[useLearningProgress] prepareUserSession resolved', { userKey: preparedKey });
      }
      setUserKey(preparedKey);

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
        setIsDailySelectionLoading(true);
        const result = await getOrCreateTodayWords(preparedKey, mode, count, category ?? null);
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
      } finally {
        if (isActive) {
          setIsDailySelectionLoading(false);
        }
      }

      await refreshStats(preparedKey);
      await refreshLearnedWords(preparedKey);
    };

    void init();

    return () => {
      isActive = false;
    };
  }, [category, refreshLearnedWords, refreshStats]);

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

  const buildCurrentTodayState = useCallback((): TodaySelectionState | null => {
    if (!dailySelection) return null;
    const date = dailySelection.date ?? new Date().toISOString();
    const resolvedMode = dailySelection.mode ?? getModeForSeverity(severity);
    const resolvedCount = dailySelection.count ?? getCountForSeverity(severity);
    const resolvedCategory = dailySelection.category ?? category ?? null;

    return {
      date,
      mode: resolvedMode,
      count: resolvedCount,
      category: resolvedCategory,
      words: todayWords,
      selection: {
        ...dailySelection,
        date,
        mode: resolvedMode,
        count: resolvedCount,
        category: resolvedCategory,
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
        if (result.learnedWords) {
          learnedCountRef.current = result.learnedWords.length;
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
          setProgressStats(applyLearnedOverride(toStats(result.summary)));
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
    async (word: string) => {
      if (!userKey) return;
      const target = todayWords.find(entry => entry.word === word);
      if (!target) return;
      const currentState = buildCurrentTodayState();
      if (!currentState) return;
      try {
        const result = await markWordAsNewService(userKey, target.word_id, currentState);
        setTodayWords(buildTodaysWords(result.words, 'ALL'));
        setDailySelection(result.selection);
        void refreshStats(userKey);
      } catch (error) {
        console.warn('[useLearningProgress] Failed to reset word', error);
      }
    },
    [buildCurrentTodayState, refreshStats, todayWords, userKey]
  );

  const orderedTodayWords = useMemo(() => buildTodaysWords(todayWords, 'ALL'), [todayWords]);

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
