/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDailyUsageTracker } from '../src/hooks/useDailyUsageTracker';
import { formatDate } from '../src/hooks/useDailyUsageTracker';

const advanceSession = async (ms: number) => {
  vi.advanceTimersByTime(ms);
  await Promise.resolve();
};

describe('useDailyUsageTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('records time and awards sticker after 15 minutes', async () => {
    renderHook(() => useDailyUsageTracker('learner1'));
    await advanceSession(16 * 60 * 1000);

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    const today = formatDate(new Date());
    const key = `dailyTime_${today}`;
    expect(parseInt(localStorage.getItem(key) || '0', 10)).toBe(16 * 60 * 1000);
    const stickers = JSON.parse(localStorage.getItem('stickers') || '[]');
    expect(stickers).toContain(today);
  });

  it('accumulates time across sessions without duplicate stickers', async () => {
    const today = formatDate(new Date());
    const key = `dailyTime_${today}`;

    renderHook(() => useDailyUsageTracker('learner1'));
    await advanceSession(5 * 60 * 1000);
    act(() => window.dispatchEvent(new Event('beforeunload')));

    renderHook(() => useDailyUsageTracker('learner1'));
    await advanceSession(10 * 60 * 1000);
    act(() => window.dispatchEvent(new Event('beforeunload')));

    expect(parseInt(localStorage.getItem(key) || '0', 10)).toBe(15 * 60 * 1000);
    const stickers = JSON.parse(localStorage.getItem('stickers') || '[]');
    expect(stickers).toEqual([today]);
  });
});
