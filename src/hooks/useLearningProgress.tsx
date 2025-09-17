import { useState, useEffect, useCallback } from 'react';
import { learningProgressService } from '@/services/learningProgressService';
import { DailySelection, SeverityLevel, LearningProgress } from '@/types/learning';
import { VocabularyWord } from '@/types/vocabulary';
import { buildTodaysWords } from '@/utils/todayWords';
import { getLocalPreferences, saveLocalPreferences } from '@/lib/preferences/localPreferences';
import { toWordId } from '@/lib/words/ids';
import { markLearnedServerByKey } from '@/lib/progress/srsSyncByUserKey';

type LearnedWordSummary = Partial<LearningProgress> & { word: string };

export const useLearningProgress = (allWords: VocabularyWord[]) => {
  const [dailySelection, setDailySelection] = useState<DailySelection | null>(null);
  const [currentWordProgress, setCurrentWordProgress] = useState<LearningProgress | null>(null);
  const [todayWords, setTodayWords] = useState<VocabularyWord[]>([]);
  const [progressStats, setProgressStats] = useState({
    total: 0,
    learning: 0,
    new: 0,
    due: 0,
    learned: 0
  });
  const [learnedWords, setLearnedWords] = useState<LearnedWordSummary[]>([]);

  const refreshStats = useCallback(() => {
    const stats = learningProgressService.getProgressStats();
    setProgressStats(stats);
  }, []);

  const generateDailyWords = useCallback((severity: SeverityLevel = 'light') => {
    if (allWords.length === 0) return;

    // Force regeneration when user clicks the buttons
    const selection = learningProgressService.forceGenerateDailySelection(allWords, severity);
    setDailySelection(selection);
    refreshStats();
    void saveLocalPreferences({ daily_option: severity });
  }, [allWords, refreshStats]);

  const markWordAsPlayed = useCallback(
    (word: string) => {
      learningProgressService.updateWordProgress(word);
      const progress = learningProgressService.getWordProgress(word);
      setCurrentWordProgress(progress);

      setDailySelection(prev => {
        if (!prev || !progress) return prev;

        const match = (p: LearningProgress) =>
          p.word === progress.word && p.category === progress.category;
        const reviewWords = prev.reviewWords.map(p => (match(p) ? progress : p));
        const newWords = prev.newWords.map(p => (match(p) ? progress : p));
        const updated: DailySelection = {
          ...prev,
          reviewWords,
          newWords
        };

        setTodayWords(
          buildTodaysWords(updated.reviewWords, updated.newWords, allWords, 'ALL')
        );

        return updated;
      });

      refreshStats();
    },
    [allWords, refreshStats]
  );

  const getWordProgress = useCallback((word: string) => {
    return learningProgressService.getWordProgress(word);
  }, []);

  useEffect(() => {
    if (allWords.length === 0) return;

    const init = async () => {
      let severity: SeverityLevel = 'light';
      try {
        const prefs = await getLocalPreferences();
        severity = (prefs.daily_option as SeverityLevel) || 'light';
        if (!prefs.daily_option) {
          await saveLocalPreferences({ daily_option: 'light' });
        }
      } catch {
        // ignore preference loading errors
      }

      let selection = learningProgressService.getTodaySelection();
      if (!selection) {
        selection = learningProgressService.forceGenerateDailySelection(allWords, severity);
      }
      setDailySelection(selection);
      refreshStats();
    };

    void init();
  }, [allWords, refreshStats]);

  useEffect(() => {
    if (!dailySelection) return;

    const words = buildTodaysWords(
      dailySelection.reviewWords,
      dailySelection.newWords,
      allWords,
      'ALL'
    );

    setTodayWords(words);
  }, [dailySelection, allWords]);

  const refreshLearnedWords = useCallback(async () => {
    try {
      const words = await learningProgressService.getLearnedWords();
      setLearnedWords(Array.isArray(words) ? words : []);
    } catch (error) {
      console.warn('[useLearningProgress] Failed to load learned words', error);
      setLearnedWords([]);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadLearnedWords = async () => {
      try {
        const words = await learningProgressService.getLearnedWords();
        if (!isActive) return;
        setLearnedWords(Array.isArray(words) ? words : []);
      } catch (error) {
        if (!isActive) return;
        console.warn('[useLearningProgress] Failed to load learned words', error);
        setLearnedWords([]);
      }
    };

    void loadLearnedWords();

    return () => {
      isActive = false;
    };
  }, []);

  const markWordLearned = useCallback((word: string) => {
    learningProgressService.markWordLearned(word);

    let category: string | undefined;
    if (dailySelection) {
      const entry = [...dailySelection.reviewWords, ...dailySelection.newWords].find(p => p.word === word);
      category = entry?.category;
    }
    if (!category) {
      const matched = allWords.find(w => w.word === word);
      category = matched?.category;
    }
    const wordId = toWordId(word, category);
    void markLearnedServerByKey(wordId).catch(() => {});

    setDailySelection(prev => {
      if (!prev) return prev;

      const found = [...prev.reviewWords, ...prev.newWords].find(p => p.word === word);
      const match = (p: LearningProgress) =>
        p.word === word && (!found || p.category === found.category);
      const reviewWords = prev.reviewWords.filter(p => !match(p));
      const newWords = prev.newWords.filter(p => !match(p));
      const updated: DailySelection = {
        ...prev,
        reviewWords,
        newWords,
        totalCount: reviewWords.length + newWords.length
      };

      setTodayWords(
        buildTodaysWords(updated.reviewWords, updated.newWords, allWords, 'ALL')
      );

      return updated;
    });

    refreshStats();
    void refreshLearnedWords();
  }, [allWords, dailySelection, refreshLearnedWords, refreshStats]);

  const markWordAsNew = useCallback((word: string) => {
    learningProgressService.markWordAsNew(word);
    refreshStats();
  }, [refreshStats]);

  return {
    dailySelection,
    currentWordProgress,
    progressStats,
    generateDailyWords,
    markWordAsPlayed,
    getWordProgress,
    refreshStats,
    refreshLearnedWords,
    learnedWords,
    markWordLearned,
    markWordAsNew,
    todayWords
  };
};
