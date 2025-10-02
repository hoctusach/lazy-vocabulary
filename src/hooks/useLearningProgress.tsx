import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  prepareUserSession,
  fetchProgressSummary as fetchProgressSummaryService,
  fetchLearnedWordSummaries,
  loadTodayWordsFromLocal,
  isToday,
  matchesCurrentOptions,
  getOrCreateTodayWords,
  fetchAndCommitTodaySelection,
  clearTodayWordsInLocal,
  markWordReviewed,
  markWordAsNew as markWordAsNewService,
  getModeForSeverity,
  getCountForSeverity,
} from '@/services/learningProgressService';
import type { DailySelection, SeverityLevel } from '@/types/learning';
import type { TodayWord } from '@/types/vocabulary';
import { getLocalPreferences, saveLocalPreferences } from '@/lib/preferences/localPreferences';
import { bootstrapLearnedFromServerByKey } from '@/lib/progress/srsSyncByUserKey';
import type { ProgressSummaryFields } from '@/lib/progress/progressSummary';
import {
  legacySummaryToDerived,
  type DerivedProgressSummary,
  type LearnedWordSummary,
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
  const total = summary.learned + summary.learning + summary.new;
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
        total: learnedOverride + stats.learning + stats.new,
      };
    },
    []
  );

  const refreshStats = useCallback(async (key?: string) => {
    const targetKey = key ?? userKey;
    if (!targetKey) return;
    try {
      const summary = await fetchProgressSummaryService(targetKey);
      const derived = legacySummaryToDerived(summary);
      setProgressStats(applyLearnedOverride(toStats(derived)));
    } catch (error) {
      console.warn('[useLearningProgress] Failed to load progress summary', error);
      setProgressStats(applyLearnedOverride(DEFAULT_STATS));
    }
  }, [applyLearnedOverride, userKey]);

  const refreshLearnedWords = useCallback(async (key?: string) => {
    const targetKey = key ?? userKey;
    if (!targetKey) return;
    try {
      const rows = await fetchLearnedWordSummaries(targetKey);
      learnedCountRef.current = rows.length;
      setLearnedWords(rows);
      setProgressStats(prev => {
        const learned = rows.length;
        return {
          ...prev,
          learned,
          total: learned + prev.learning + prev.new,
        };
      });
    } catch (error) {
      console.warn('[useLearningProgress] Failed to load learned words', error);
      setLearnedWords([]);
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
      const cached = loadTodayWordsFromLocal(preparedKey);
      const hasUsableCache = Boolean(
        cached && isToday(cached.date) && matchesCurrentOptions(cached, { mode, count, category })
      );
      if (hasUsableCache && cached) {
        if (!isActive) return;
        setDailySelection(cached.selection);
        setTodayWords(cached.words);
        setIsDailySelectionLoading(false);
      }

      try {
        if (!hasUsableCache) {
          setIsDailySelectionLoading(true);
        }
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
        if (!hasUsableCache) {
          setDailySelection(null);
          setTodayWords([]);
        }
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
    clearTodayWordsInLocal(userKey);
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

  const markWordLearned = useCallback(
    async (word: string) => {
      if (!userKey) return;
      const target = todayWords.find(entry => entry.word === word);
      if (!target) return;
      try {
        const result = await markWordReviewed(userKey, target.word_id, severity);
        setDailySelection(result.selection);
        setTodayWords(result.words);
        if (result.learnedWords) {
          learnedCountRef.current = result.learnedWords.length;
          setLearnedWords(result.learnedWords);
        } else {
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
    [applyLearnedOverride, refreshLearnedWords, refreshStats, severity, todayWords, userKey]
  );

  const markWordAsNew = useCallback(
    async (word: string) => {
      if (!userKey) return;
      const target = todayWords.find(entry => entry.word === word);
      if (!target) return;
      try {
        const updated = await markWordAsNewService(userKey, target.word_id);
        setTodayWords(buildTodaysWords(updated, 'ALL'));
        const refreshed = loadTodayWordsFromLocal(userKey);
        if (refreshed) {
          setDailySelection(refreshed.selection);
        }
        void refreshStats(userKey);
      } catch (error) {
        console.warn('[useLearningProgress] Failed to reset word', error);
      }
    },
    [refreshStats, todayWords, userKey]
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
    markWordLearned,
    markWordAsNew,
    todayWords: orderedTodayWords,
    isDailySelectionLoading,
  };
};
