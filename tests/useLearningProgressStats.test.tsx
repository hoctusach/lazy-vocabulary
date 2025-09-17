/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { learningProgressService } from '@/services/learningProgressService';
import { getLocalPreferences, saveLocalPreferences } from '@/lib/preferences/localPreferences';

vi.mock('@/lib/preferences/localPreferences', () => ({
  getLocalPreferences: vi.fn().mockResolvedValue({
    favorite_voice: null,
    speech_rate: null,
    is_muted: false,
    is_playing: true,
    daily_option: 'light'
  }),
  saveLocalPreferences: vi.fn().mockResolvedValue(undefined)
}));

describe('useLearningProgress', () => {
  it('provides learned stat from service', () => {
    const mockStats = { total: 1, learning: 0, new: 0, due: 0, learned: 1 };
    const spy = vi.spyOn(learningProgressService, 'getProgressStats').mockReturnValue(mockStats);

    const { result } = renderHook(() => useLearningProgress([]));

    act(() => {
      result.current.refreshStats();
    });

    expect(result.current.progressStats.learned).toBe(1);
    spy.mockRestore();
  });
});
