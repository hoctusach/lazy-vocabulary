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
    due: 0
  });

  const refreshStats = useCallback(() => {
    const stats = learningProgressService.getProgressStats();
    setProgressStats(stats);
  }, []);

  const generateDailyWords = useCallback((severity: SeverityLevel = 'moderate') => {
    if (allWords.length === 0) return;
    
    const selection = learningProgressService.generateDailySelection(allWords, severity);
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

  const getDueReviewWords = useCallback(() => {
    return learningProgressService.getDueReviewWords();
  }, []);

  return {
    dailySelection,
    currentWordProgress,
    progressStats,
    generateDailyWords,
    markWordAsPlayed,
    getWordProgress,
    loadTodaySelection,
    refreshStats,
    getDueReviewWords
  };
};