import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  prepareUserSession,
  fetchProgressSummary as fetchProgressSummaryService,
  fetchLearnedWordSummaries,
  type LearnedWordSummaryRow,
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
import { buildTodaysWords } from '@/utils/todayWords';

const DEFAULT_STATS = {
  total: 0,
  learning: 0,
  new: 0,
  due: 0,
  learned: 0
};

function toStats(summary: ProgressSummaryFields | null): typeof DEFAULT_STATS {
  if (!summary) return DEFAULT_STATS;
  const total = summary.learning_count + summary.learned_count + summary.remaining_count;
  return {
    total,
    learning: summary.learning_count,
    new: summary.remaining_count,
    due: summary.learning_due_count,
    learned: summary.learned_count
  };
}

export const useLearningProgress = () => {
  const [userKey, setUserKey] = useState<string | null>(null);
  const [severity, setSeverity] = useState<SeverityLevel>('light');
  const [category] = useState<string | null>(null);
  const [dailySelection, setDailySelection] = useState<DailySelection | null>(null);
  const [todayWords, setTodayWords] = useState<TodayWord[]>([]);
  const [progressStats, setProgressStats] = useState(DEFAULT_STATS);
  const [learnedWords, setLearnedWords] = useState<LearnedWordSummaryRow[]>([]);

  const refreshStats = useCallback(async (key?: string) => {
    const targetKey = key ?? userKey;
    if (!targetKey) return;
    try {
      const summary = await fetchProgressSummaryService(targetKey);
      setProgressStats(toStats(summary));
    } catch (error) {
      console.warn('[useLearningProgress] Failed to load progress summary', error);
      setProgressStats(DEFAULT_STATS);
    }
  }, [userKey]);

  const refreshLearnedWords = useCallback(async (key?: string) => {
    const targetKey = key ?? userKey;
    if (!targetKey) return;
    try {
      const { filtered, filteredCount } = await fetchLearnedWordSummaries(targetKey);
      setLearnedWords(filtered);
      setProgressStats(prev => {
        const updated = {
          ...prev,
          learned: filteredCount,
          total: prev.learning + prev.new + filteredCount,
        };
        if (process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
          console.log('[useLearningProgress] refreshed learned count', {
            learned: filteredCount,
            total: updated.total,
          });
        }
        return updated;
      });
    } catch (error) {
      console.warn('[useLearningProgress] Failed to load learned words', error);
      setLearnedWords([]);
      setProgressStats(prev => {
        const updated = {
          ...prev,
          learned: 0,
          total: prev.learning + prev.new,
        };
        if (process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
          console.log('[useLearningProgress] refreshed learned count (error fallback)', {
            learned: 0,
            total: updated.total,
          });
        }
        return updated;
      });
    }
  }, [userKey]);

  const refreshSummaryAndLearned = useCallback(
    async (key?: string) => {
      const targetKey = key ?? userKey;
      if (!targetKey) return;
      await refreshStats(targetKey);
      await refreshLearnedWords(targetKey);
    },
    [refreshLearnedWords, refreshStats, userKey]
  );

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
      if (cached && isToday(cached.date) && matchesCurrentOptions(cached, { mode, count, category })) {
        if (!isActive) return;
        setDailySelection(cached.selection);
        setTodayWords(cached.words);
      }

      try {
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
        if (!cached) {
          setTodayWords([]);
        }
      }

      await refreshSummaryAndLearned(preparedKey);
    };

    void init();

    return () => {
      isActive = false;
    };
  }, [category, refreshSummaryAndLearned]);

  const generateDailyWords = useCallback(
    async (level: SeverityLevel = 'light') => {
      if (!userKey) return;
      try {
        const mode = getModeForSeverity(level);
        const count = getCountForSeverity(level);
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
        await refreshSummaryAndLearned(userKey);
      } catch (error) {
        console.warn('[useLearningProgress] Failed to regenerate daily words', error);
      }
    },
    [category, refreshSummaryAndLearned, userKey]
  );

  const regenerateToday = useCallback(async () => {
    if (!userKey) return;
    const mode = getModeForSeverity(severity);
    const count = getCountForSeverity(severity);
    clearTodayWordsInLocal(userKey);
    try {
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
      await refreshSummaryAndLearned(userKey);
    } catch (error) {
      console.warn('[useLearningProgress] Failed to regenerate today\'s selection', error);
    }
  }, [category, refreshSummaryAndLearned, severity, userKey]);

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
        if (result.summary) {
          setProgressStats(toStats(result.summary));
          await refreshLearnedWords(userKey);
        } else {
          await refreshSummaryAndLearned(userKey);
        }
      } catch (error) {
        console.warn('[useLearningProgress] Failed to mark word learned', error);
      }
    },
    [refreshLearnedWords, refreshSummaryAndLearned, severity, todayWords, userKey]
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
        await refreshSummaryAndLearned(userKey);
      } catch (error) {
        console.warn('[useLearningProgress] Failed to reset word', error);
      }
    },
    [refreshSummaryAndLearned, todayWords, userKey]
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
  };
};
