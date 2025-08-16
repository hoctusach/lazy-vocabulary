import { useState, useEffect, useCallback } from 'react';
import { learningProgressService } from '@/services/learningProgressService';
import { DailySelection, SeverityLevel, LearningProgress } from '@/types/learning';
import { VocabularyWord } from '@/types/vocabulary';
import { buildTodaysWords } from '@/utils/todayWords';

export const useLearningProgress = (allWords: VocabularyWord[]) => {
  const [dailySelection, setDailySelection] = useState<DailySelection | null>(null);
  const [currentWordProgress, setCurrentWordProgress] = useState<LearningProgress | null>(null);
  const [todayWords, setTodayWords] = useState<VocabularyWord[]>([]);
  const [progressStats, setProgressStats] = useState({
    total: 0,
    learned: 0,
    new: 0,
    due: 0,
    learnedCompleted: 0
  });

  const refreshStats = useCallback(() => {
    const stats = learningProgressService.getProgressStats();
    setProgressStats(stats);
  }, []);

  const generateDailyWords = useCallback((severity: SeverityLevel = 'moderate') => {
    if (allWords.length === 0) return;
    
    // Force regeneration when user clicks the buttons
    const selection = learningProgressService.forceGenerateDailySelection(allWords, severity);
    setDailySelection(selection);
    refreshStats();
  }, [allWords, refreshStats]);

  const markWordAsPlayed = useCallback((word: string) => {
    learningProgressService.updateWordProgress(word);
    const progress = learningProgressService.getWordProgress(word);
    setCurrentWordProgress(progress);
    refreshStats();
  }, [refreshStats]);

  const getWordProgress = useCallback((word: string) => {
    return learningProgressService.getWordProgress(word);
  }, []);

  useEffect(() => {
    if (allWords.length === 0) return;

    let selection = learningProgressService.getTodaySelection();
    if (!selection) {
      selection = learningProgressService.forceGenerateDailySelection(allWords, 'moderate');
    }
    setDailySelection(selection);
    refreshStats();
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

  const getDueReviewWords = useCallback(() => {
    return learningProgressService.getDueReviewWords();
  }, []);

  const getDueReviewWordList = useCallback((): VocabularyWord[] => {
    const dueProgress = learningProgressService.getDueReviewWords();
    return buildTodaysWords(dueProgress, [], allWords, 'ALL');
  }, [allWords]);

  const getLearnedWords = useCallback(() => {
    return learningProgressService.getLearnedWords();
  }, []);

  const markWordLearned = useCallback((word: string) => {
    learningProgressService.markWordLearned(word);

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
  }, [allWords, refreshStats]);

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
    getDueReviewWords,
    getDueReviewWordList,
    getLearnedWords,
    markWordLearned,
    markWordAsNew,
    todayWords
  };
};
