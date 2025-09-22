import { useCallback, useEffect, useMemo, useState } from 'react';
import { learningProgressService } from '@/services/learningProgressService';
import type { DailySelection, SeverityLevel } from '@/types/learning';
import type { TodayWord } from '@/types/vocabulary';
import { buildTodaysWords } from '@/utils/todayWords';
import { getLocalPreferences, saveLocalPreferences } from '@/lib/preferences/localPreferences';
import { bootstrapLearnedFromServerByKey } from '@/lib/progress/srsSyncByUserKey';
import type { ProgressSummaryFields } from '@/lib/progress/progressSummary';

const DEFAULT_STATS = {
  total: 0,
  learning: 0,
  new: 0,
  due: 0,
  learned: 0
};

type LearnedWordSummary = {
  word: string;
  category?: string;
  learnedDate?: string;
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
  const [dailySelection, setDailySelection] = useState<DailySelection | null>(null);
  const [todayWords, setTodayWords] = useState<TodayWord[]>([]);
  const [progressStats, setProgressStats] = useState(DEFAULT_STATS);
  const [learnedWords, setLearnedWords] = useState<LearnedWordSummary[]>([]);

  const refreshStats = useCallback(async (key?: string) => {
    const targetKey = key ?? userKey;
    if (!targetKey) return;
    try {
      const summary = await learningProgressService.fetchProgressSummary(targetKey);
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
      const rows = await learningProgressService.fetchLearnedWordSummaries(targetKey);
      setLearnedWords(rows);
    } catch (error) {
      console.warn('[useLearningProgress] Failed to load learned words', error);
      setLearnedWords([]);
    }
  }, [userKey]);

  useEffect(() => {
    let isActive = true;
    const init = async () => {
      const preparedKey = await learningProgressService.prepareUserSession();
      if (!preparedKey || !isActive) return;
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

      try {
        const result = await learningProgressService.getTodayWords(preparedKey, preferredSeverity);
        if (!isActive) return;
        setDailySelection(result.selection);
        setTodayWords(buildTodaysWords(result.words, 'ALL'));
      } catch (error) {
        if (!isActive) return;
        console.warn('[useLearningProgress] Failed to load today\'s words', error);
        setDailySelection(null);
        setTodayWords([]);
      }

      await refreshStats(preparedKey);
      await refreshLearnedWords(preparedKey);
    };

    void init();

    return () => {
      isActive = false;
    };
  }, [refreshLearnedWords, refreshStats]);

  const generateDailyWords = useCallback(
    async (level: SeverityLevel = 'light') => {
      if (!userKey) return;
      try {
        const result = await learningProgressService.regenerateTodayWords(userKey, level);
        setSeverity(level);
        setDailySelection(result.selection);
        setTodayWords(buildTodaysWords(result.words, 'ALL'));
        await saveLocalPreferences({ daily_option: level });
        void refreshStats(userKey);
      } catch (error) {
        console.warn('[useLearningProgress] Failed to regenerate daily words', error);
      }
    },
    [userKey, refreshStats]
  );

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
        const result = await learningProgressService.markWordReviewed(userKey, target.word_id, severity);
        setDailySelection(result.selection);
        setTodayWords(buildTodaysWords(result.words, 'ALL'));
        if (result.summary) {
          setProgressStats(toStats(result.summary));
        } else {
          void refreshStats(userKey);
        }
        void refreshLearnedWords(userKey);
      } catch (error) {
        console.warn('[useLearningProgress] Failed to mark word learned', error);
      }
    },
    [refreshLearnedWords, refreshStats, severity, todayWords, userKey]
  );

  const markWordAsNew = useCallback(
    async (word: string) => {
      if (!userKey) return;
      const target = todayWords.find(entry => entry.word === word);
      if (!target) return;
      try {
        const updated = await learningProgressService.markWordAsNew(userKey, target.word_id);
        setTodayWords(buildTodaysWords(updated, 'ALL'));
        const selection = await learningProgressService.getTodayWords(userKey, severity);
        setDailySelection(selection.selection);
        void refreshStats(userKey);
      } catch (error) {
        console.warn('[useLearningProgress] Failed to reset word', error);
      }
    },
    [severity, todayWords, userKey, refreshStats]
  );

  const orderedTodayWords = useMemo(() => buildTodaysWords(todayWords, 'ALL'), [todayWords]);

  return {
    dailySelection,
    progressStats,
    generateDailyWords,
    markWordAsPlayed,
    refreshStats,
    refreshLearnedWords,
    learnedWords,
    markWordLearned,
    markWordAsNew,
    todayWords: orderedTodayWords,
  };
};
