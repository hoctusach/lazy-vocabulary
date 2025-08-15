import { useState, useEffect, useCallback } from 'react';
import { learningProgressService } from '@/services/learningProgressService';
import { DailySelection, SeverityLevel, LearningProgress } from '@/types/learning';
import { VocabularyWord } from '@/types/vocabulary';

export const useLearningProgress = (allWords: VocabularyWord[]) => {
  const [dailySelection, setDailySelection] = useState<DailySelection | null>(null);
  const [currentWordProgress, setCurrentWordProgress] = useState<LearningProgress | null>(null);
  const [progressStats, setProgressStats] = useState({
    total: 0,
    learned: 0,
    new: 0,
    due: 0,
    retired: 0
  });

  const refreshStats = useCallback(async () => {
    const stats = await learningProgressService.getProgressStats(allWords);
    setProgressStats(stats);
  }, [allWords]);

  const generateDailyWords = useCallback(async (severity: SeverityLevel = 'moderate') => {
    if (allWords.length === 0) return;
    
    // Force regeneration when user clicks the buttons
    const selection = await learningProgressService.forceGenerateDailySelection(allWords, severity);
    setDailySelection(selection);
    await refreshStats();
  }, [allWords, refreshStats]);

  const markWordAsPlayed = useCallback(async (word: string) => {
    await learningProgressService.updateWordProgress(word);
    const progress = await learningProgressService.getWordProgress(word);
    setCurrentWordProgress(progress);
    refreshStats();
  }, [refreshStats]);

  const getWordProgress = useCallback(async (word: string) => {
    return await learningProgressService.getWordProgress(word);
  }, []);

  const loadTodaySelection = useCallback(() => {
    const selection = learningProgressService.getTodaySelection();
    setDailySelection(selection);
  }, []);

  useEffect(() => {
    if (allWords.length > 0) {
      loadTodaySelection();
      refreshStats();
    }
  }, [allWords, loadTodaySelection, refreshStats]);

  const getDueReviewWords = useCallback(async () => {
    return await learningProgressService.getDueReviewWords();
  }, []);

  const getRetiredWords = useCallback(async () => {
    return await learningProgressService.getRetiredWords();
  }, []);

  const retireCurrentWord = useCallback(async (word: string) => {
    await learningProgressService.retireWord(word);
    refreshStats();
  }, [refreshStats]);

  return {
    dailySelection,
    currentWordProgress,
    progressStats,
    generateDailyWords,
    markWordAsPlayed,
    getWordProgress,
    loadTodaySelection,
    refreshStats,
    getDueReviewWords,
    getRetiredWords,
    retireCurrentWord
  };
};
