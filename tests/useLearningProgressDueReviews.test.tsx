/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { learningProgressService } from '@/services/learningProgressService';
import { VocabularyWord } from '@/types/vocabulary';
import { LearningProgress, DailySelection } from '@/types/learning';

describe('useLearningProgress due reviews', () => {
  const dueWord: VocabularyWord = { word: 'apple', meaning: '', example: '', category: 'fruit' };
  const newWord: VocabularyWord = { word: 'banana', meaning: '', example: '', category: 'fruit' };
  const allWords = [dueWord, newWord];

  const dueProgress: LearningProgress = {
    word: 'apple',
    category: 'fruit',
    isLearned: true,
    reviewCount: 1,
    lastPlayedDate: '',
    status: 'due',
    nextReviewDate: '',
    createdDate: ''
  };

  const newProgress: LearningProgress = {
    word: 'banana',
    category: 'fruit',
    isLearned: false,
    reviewCount: 0,
    lastPlayedDate: '',
    status: 'new',
    nextReviewDate: '',
    createdDate: ''
  };

  const selection: DailySelection = {
    reviewWords: [dueProgress],
    newWords: [newProgress],
    totalCount: 2,
    severity: 'light'
  };

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(learningProgressService, 'getProgressStats').mockReturnValue({
      total: 0,
      learning: 0,
      new: 0,
      due: 0,
      learned: 0
    });
    vi.spyOn(learningProgressService, 'getTodaySelection').mockReturnValue(selection);
    vi.spyOn(learningProgressService, 'forceGenerateDailySelection').mockReturnValue(selection);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('includes due review words in todayWords after generation and regeneration', async () => {
    const { result } = renderHook(() => useLearningProgress(allWords));
    await act(() => Promise.resolve());
    expect(result.current.todayWords.map(w => w.word)).toContain('apple');

    await act(() => {
      result.current.generateDailyWords('light');
    });
    await act(() => Promise.resolve());
    expect(result.current.todayWords.map(w => w.word)).toContain('apple');
  });
});
