/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { learningProgressService } from '@/services/learningProgressService';
import { VocabularyWord } from '@/types/vocabulary';

describe('markWordLearned', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes word from todayWords and cached daily selection', async () => {
    const word: VocabularyWord = { word: 'apple', meaning: '', example: '', category: 'fruit' };

    // Generate selection with the test word
    learningProgressService.forceGenerateDailySelection([word], 'light');

    const { result } = renderHook(() => useLearningProgress([word]));
    await act(() => Promise.resolve());
    expect(result.current.todayWords.length).toBe(1);

    await act(async () => {
      result.current.markWordLearned('apple');
    });

    expect(result.current.todayWords).toHaveLength(0);
    const cached = JSON.parse(localStorage.getItem('dailySelection')!);
    expect(cached.newWords).toHaveLength(0);
    expect(cached.reviewWords).toHaveLength(0);
    expect(cached.totalCount).toBe(0);
  });
});
