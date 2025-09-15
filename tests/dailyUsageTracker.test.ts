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

describe('useDailyUsageTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('records time locally', async () => {
    renderHook(() => useDailyUsageTracker());
    await advanceSession(16 * 60 * 1000);

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    const today = new Date().toISOString().slice(0, 10);
    const key = `dailyTime_${today}`;
    expect(parseInt(localStorage.getItem(key) || '0', 10)).toBe(16 * 60 * 1000);
  });

  it('accumulates time across sessions', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const key = `dailyTime_${today}`;

    renderHook(() => useDailyUsageTracker());
    await advanceSession(5 * 60 * 1000);
    act(() => window.dispatchEvent(new Event('beforeunload')));

    renderHook(() => useDailyUsageTracker());
    await advanceSession(10 * 60 * 1000);
    act(() => window.dispatchEvent(new Event('beforeunload')));

    expect(parseInt(localStorage.getItem(key) || '0', 10)).toBe(15 * 60 * 1000);
  });
});
