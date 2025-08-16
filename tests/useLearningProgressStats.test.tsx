/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { learningProgressService } from '@/services/learningProgressService';

describe('useLearningProgress', () => {
  it('provides learnedCompleted stat from service', () => {
    const mockStats = { total: 1, learned: 1, new: 0, due: 0, learnedCompleted: 1 };
    const spy = vi.spyOn(learningProgressService, 'getProgressStats').mockReturnValue(mockStats);

    const { result } = renderHook(() => useLearningProgress([]));

    act(() => {
      result.current.refreshStats();
    });

    expect(result.current.progressStats.learnedCompleted).toBe(1);
    spy.mockRestore();
  });
});
