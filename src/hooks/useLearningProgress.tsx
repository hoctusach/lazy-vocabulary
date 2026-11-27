import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  prepareUserSession,
  getOrCreateTodayWords,
  fetchAndCommitTodaySelection,
  markWordReviewed,
  markWordAsNew as markWordAsNewService,
  getModeForSeverity,
  getCountForSeverity,
  appendTodayWords,
  type TodaySelectionState,
  type TodaySelectionWithStats,
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
import { planBuiltinSelection } from '@/features/word-sets/mixQueue';
import { BUILTIN_GROUPS } from '@/features/word-sets/vocabularySetStore';
import { buildTodaysWords } from '@/utils/todayWords';
import {
  identifyUser,
  trackDailySelectionEvent,
  trackReviewDue,
  trackWordLearned,
  trackWordReset,
} from '@/services/analyticsService';
import { getNicknameLocal } from '@/lib/nickname';
import { formatDateKey } from '@/utils/dateKey';
import { isInActiveSet, pickTopUp, toTodaySummary } from '@/services/dailyTopUp';
import { topUpNeeded } from '@/lib/progress/dailyTarget';
import { localKey } from '@/lib/progress/streak';
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

export interface UseLearningProgressOptions {
  /**
   * Built-in groups the learner is mixing (multi-set selection). Omitted = all six, i.e. the
   * original behaviour. One group -> p_category = that group. 2-5 groups -> RPC with NULL and the
   * rows are filtered client-side. None -> the RPC is never called.
   */
  builtinGroups?: readonly string[];
}

export const useLearningProgress = (options: UseLearningProgressOptions = {}) => {
  const groupsKey = (options.builtinGroups ?? BUILTIN_GROUPS).join('|');
  const plan = useMemo(
    () => planBuiltinSelection(groupsKey ? groupsKey.split('|') : []),
    [groupsKey]
  );
  const category = plan.category;
  const filterGroups = plan.filterGroups;
  const filterKey = filterGroups ? filterGroups.join('|') : '';
  const [userKey, setUserKey] = useState<string | null>(null);
  const [severity, setSeverity] = useState<SeverityLevel>('light');
  const [dailySelection, setDailySelection] = useState<DailySelection | null>(null);
  const [todayWords, setTodayWords] = useState<TodayWord[]>([]);
  const [progressStats, setProgressStats] = useState(DEFAULT_STATS);
  const learnedCountRef = useRef<number | null>(null);
  const [learnedWords, setLearnedWords] = useState<LearnedWordSummary[]>([]);
  const [learnedTodayWords, setLearnedTodayWords] = useState<LearnedWordSummary[]>([]);
  const [newTodayLearnedWords, setNewTodayLearnedWords] = useState<TodayLearnedWordSummary[]>([]);
  const [dueTodayLearnedWords, setDueTodayLearnedWords] = useState<TodayLearnedWordSummary[]>([]);
  const [isDailySelectionLoading, setIsDailySelectionLoading] = useState(true);
  const [progressError, setProgressError] = useState<string | null>(null);
  const dueEventTrackerRef = useRef<Set<string>>(new Set());
  const identifiedKeyRef = useRef<string | null>(null);

  const emitDailySelectionEvent = useCallback(
    (
      action: 'loaded' | 'prepared' | 'regenerated',
      result: TodaySelectionWithStats,
      trigger: 'auto' | 'generate' | 'regenerate'
    ) => {
      const selection = result.selection ?? null;
      const selectionSource =
        (selection as { source?: string | null } | null)?.source ?? null;

      trackDailySelectionEvent(action, {
        trigger,
        mode: selection?.mode ?? null,
        count: selection?.count ?? null,
        category: selection?.category ?? category ?? null,
        source: selectionSource,
        wordCount: Array.isArray(result.words) ? result.words.length : null,
        newCount: Array.isArray(result.newTodayWords) ? result.newTodayWords.length : null,
        dueCount: Array.isArray(result.dueTodayWords) ? result.dueTodayWords.length : null,
      });
    },
    [category]
  );

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
        setProgressError(null);
        setDailySelection(null);
        setTodayWords([]);
        setLearnedWords([]);
        setLearnedTodayWords([]);
        setNewTodayLearnedWords([]);
        setDueTodayLearnedWords([]);
        setProgressStats(applyLearnedOverride(null));
        setIsDailySelectionLoading(true);
        setUserKey(nextKey);
        return;
      }

      learnedCountRef.current = null;
      setProgressError(null);
      setUserKey(null);
      setDailySelection(null);
      setTodayWords([]);
      setLearnedWords([]);
        setLearnedTodayWords([]);
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
      if (!plan.call) {
        // No built-in group selected: never touch the daily-selection RPC.
        learnedCountRef.current = null;
        setDailySelection(null);
        setTodayWords([]);
        setProgressError(null);
        setIsDailySelectionLoading(false);
        return;
      }
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
          const result = filterGroups
            ? await getOrCreateTodayWords(userKey, mode, count, category ?? null, filterGroups)
            : await getOrCreateTodayWords(userKey, mode, count, category ?? null);
          if (!isActive) return;
          setDailySelection(result.selection);
          setTodayWords(result.words);
          if (process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
            console.log('[useLearningProgress] setTodayWords from init', {
              words: result.words.map(word => ({ word_id: word.word_id, word: word.word, category: word.category })),
            });
          }
          setProgressError(null);
          learnedCountRef.current =
            result.summary?.source === 'server' ? null : result.learnedWords.length;
          setLearnedWords(result.learnedWords);
          setLearnedTodayWords(result.learnedTodayWords);
          setNewTodayLearnedWords(result.newTodayWords);
          setDueTodayLearnedWords(result.dueTodayWords);
          setProgressStats(applyLearnedOverride(result.summary ?? null));
          emitDailySelectionEvent('loaded', result, 'auto');
        } catch (error) {
          if (!isActive) return;
          console.warn('[useLearningProgress] Failed to load today\'s words', error);
          setDailySelection(null);
          setTodayWords([]);
          learnedCountRef.current = null;
          setLearnedWords([]);
        setLearnedTodayWords([]);
          setNewTodayLearnedWords([]);
          setDueTodayLearnedWords([]);
          setProgressStats(applyLearnedOverride(null));
        }
      } catch (error) {
        if (!isActive) return;
        console.warn('[useLearningProgress] Failed to initialize learning progress', error);
        setDailySelection(null);
        setTodayWords([]);
        learnedCountRef.current = null;
        setLearnedWords([]);
        setLearnedTodayWords([]);
        setNewTodayLearnedWords([]);
        setDueTodayLearnedWords([]);
        setProgressStats(applyLearnedOverride(null));
      } finally {
        if (isActive) {
          setIsDailySelectionLoading(false);
        }
      }
    };

    void initForUser();

    return () => {
      isActive = false;
    };
  }, [applyLearnedOverride, category, emitDailySelectionEvent, filterKey, plan.call, userKey]);

  const generateDailyWords = useCallback(
    async (level: SeverityLevel = 'light') => {
      if (!userKey || !plan.call) return;
      try {
        const mode = getModeForSeverity(level);
        const count = getCountForSeverity(level);
        setIsDailySelectionLoading(true);
        const result = await fetchAndCommitTodaySelection({
          userKey,
          mode,
          count,
          category: category ?? null,
          filterGroups,
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
        setProgressError(null);
        learnedCountRef.current =
          result.summary?.source === 'server' ? null : result.learnedWords.length;
        setLearnedWords(result.learnedWords);
        setLearnedTodayWords(result.learnedTodayWords);
        setNewTodayLearnedWords(result.newTodayWords);
        setDueTodayLearnedWords(result.dueTodayWords);
        setProgressStats(applyLearnedOverride(result.summary ?? null));
        emitDailySelectionEvent('prepared', result, 'generate');
      } catch (error) {
        console.warn('[useLearningProgress] Failed to regenerate daily words', error);
      } finally {
        setIsDailySelectionLoading(false);
      }
    },
    [applyLearnedOverride, category, emitDailySelectionEvent, filterGroups, plan.call, userKey]
  );

  const regenerateToday = useCallback(async () => {
    if (!userKey || !plan.call) return;
    const mode = getModeForSeverity(severity);
    const count = getCountForSeverity(severity);
    try {
      setIsDailySelectionLoading(true);
      const result = await fetchAndCommitTodaySelection({
        userKey,
        mode,
        count,
        category: category ?? null,
        filterGroups,
      });
      setDailySelection(result.selection);
      setTodayWords(result.words);
      if (process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
        console.log('[useLearningProgress] setTodayWords from regenerateToday', {
          words: result.words.map(word => ({ word_id: word.word_id, word: word.word, category: word.category })),
        });
      }
      setProgressError(null);
      learnedCountRef.current =
        result.summary?.source === 'server' ? null : result.learnedWords.length;
      setLearnedWords(result.learnedWords);
      setLearnedTodayWords(result.learnedTodayWords);
      setNewTodayLearnedWords(result.newTodayWords);
      setDueTodayLearnedWords(result.dueTodayWords);
      setProgressStats(applyLearnedOverride(result.summary ?? null));
      emitDailySelectionEvent('regenerated', result, 'regenerate');
    } catch (error) {
      console.warn('[useLearningProgress] Failed to regenerate today\'s selection', error);
    } finally {
      setIsDailySelectionLoading(false);
    }
  }, [applyLearnedOverride, category, emitDailySelectionEvent, filterGroups, plan.call, severity, userKey]);

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
        trackWordLearned(userKey, {
          wordId: target.word_id,
          category: target.category,
          srsState: result.payload?.srs_state ?? target.srs?.srs_state ?? null,
          srsIntervalDays: result.payload?.srs_interval_days ?? target.srs?.srs_interval_days ?? null,
        });
        setProgressError(null);
        if (result.summary?.source === 'server') {
          learnedCountRef.current = null;
        }
        if (result.learnedWords) {
          if (result.summary?.source !== 'server') {
            learnedCountRef.current = result.learnedWords.length;
          }
          setLearnedWords(result.learnedWords);
        }
        if (result.summary) {
          setProgressStats(applyLearnedOverride(result.summary));
        }

        // [FB-51] The word leaves NEW/DUE and joins LEARNED-today (it still counts toward today's 20).
        const same = (entry: { word: string }) => entry.word === target.word;
        const nowIso = new Date().toISOString();
        const nextLearnedToday = [
          { word: target.word, category: target.category, learnedDate: nowIso },
          ...learnedTodayWords.filter((entry) => !same(entry)),
        ];
        let nextNew = newTodayLearnedWords.filter((entry) => !same(entry));
        let nextDue = dueTodayLearnedWords.filter((entry) => !same(entry));
        let nextState = { ...currentState, words: result.words, selection: result.selection };

        // ...and if today is now short (active + learned today < 20), top up on the device: Due first, then New.
        const need = topUpNeeded(result.words.length, nextLearnedToday.length);
        if (need > 0) {
          const picked = pickTopUp({
            need,
            excludeWords: [
              ...result.words.map((word) => word.word),
              ...nextLearnedToday.map((entry) => entry.word),
              ...learnedWords.map((entry) => entry.word),
              ...(result.learnedWords ?? []).map((entry) => entry.word),
            ],
            groups: filterGroups ?? (category ? [category] : null),
            seed: `${userKey}|${localKey(new Date())}`,
          });
          const extras = [...picked.due, ...picked.fresh];
          if (extras.length > 0) {
            nextState = appendTodayWords(nextState, extras, severity);
            nextDue = [...nextDue, ...picked.due.map((word) => toTodaySummary(word, true))];
            nextNew = [...nextNew, ...picked.fresh.map((word) => toTodaySummary(word, false))];
          }
        }
        setDailySelection(nextState.selection);
        setTodayWords(nextState.words);
        setLearnedTodayWords(nextLearnedToday);
        setNewTodayLearnedWords(nextNew);
        setDueTodayLearnedWords(nextDue);
      } catch (error) {
        console.warn('[useLearningProgress] Failed to mark word learned', error);
      }
    },
    [applyLearnedOverride, buildCurrentTodayState, category, dueTodayLearnedWords, filterGroups, learnedTodayWords, learnedWords, newTodayLearnedWords, severity, todayWords, userKey]
  );

  const markWordAsNew = useCallback(
    async (wordId: string) => {
      if (!userKey || !wordId) return false;
      try {
        const result = await markWordAsNewService(userKey, wordId);
        if (!result) {
          return false;
        }

        setProgressError(null);
        learnedCountRef.current = result.summary.source === 'server' ? null : result.learnedWords.length;
        setLearnedWords(result.learnedWords);
        setLearnedTodayWords(result.learnedTodayWords);
        setNewTodayLearnedWords(result.newTodayWords.filter(isInActiveSet));
        setDueTodayLearnedWords(result.dueTodayWords.filter(isInActiveSet));
        setProgressStats(applyLearnedOverride(result.summary));
        const [idWord, idCategory] = wordId.split('::');
        const safeWord = (idWord ?? wordId).trim();
        const safeCategory = idCategory?.trim() || null;
        trackWordReset({
          wordId,
          word: safeWord || wordId,
          category: safeCategory,
          trigger: 'manual_reset',
        });
        return true;
      } catch (error) {
        console.warn('[useLearningProgress] Failed to reset word', error);
        return false;
      }
    },
    [applyLearnedOverride, userKey]
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
    learnedWords,
    learnedTodayWords,
    newTodayLearnedWords,
    dueTodayLearnedWords,
    markWordLearned,
    markWordAsNew,
    todayWords: orderedTodayWords,
    isDailySelectionLoading,
    progressError,
  };
};
