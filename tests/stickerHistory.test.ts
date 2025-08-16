/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDailyUsageTracker } from '../src/hooks/useDailyUsageTracker';

const advanceSession = async (ms: number) => {
  vi.advanceTimersByTime(ms);
  await Promise.resolve();
};

describe('sticker history persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('keeps sticker dates after earning a medal', async () => {
    const start = new Date('2024-07-01T00:00:00Z');

    for (let i = 0; i < 5; i++) {
      vi.setSystemTime(new Date(start.getTime() + i * 24 * 60 * 60 * 1000));
      const { unmount } = renderHook(() => useDailyUsageTracker('learner1'));
      await advanceSession(16 * 60 * 1000);
      act(() => window.dispatchEvent(new Event('beforeunload')));
      unmount();
    }

    const stickers = JSON.parse(localStorage.getItem('stickers') || '[]');
    expect(stickers).toEqual([
      '2024-07-01',
      '2024-07-02',
      '2024-07-03',
      '2024-07-04',
      '2024-07-05'
    ]);

    expect(JSON.parse(localStorage.getItem('streakDays') || '[]')).toEqual([]);
  });
});
