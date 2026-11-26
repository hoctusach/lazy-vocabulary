/**
 * @vitest-environment jsdom
 * Daily reminder rules (J2-J6).
 */
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.fn();
const ensureUserKey = vi.fn();
const getProgressSummary = vi.fn();

vi.mock('sonner', () => ({ toast: (...args: unknown[]) => toast(...args) }));
vi.mock('@/lib/progress/srsSyncByUserKey', () => ({ ensureUserKey: () => ensureUserKey() }));
vi.mock('@/lib/progress/progressSummary', () => ({ getProgressSummary: (key: string) => getProgressSummary(key) }));

import { useDailyReminder } from '@/hooks/useDailyReminder';

const STATE_KEY = 'lazyVoca.reminder.state';
const NOW = new Date('2026-03-10T10:00:00Z');
const today = '2026-03-10';

const setVisibility = (state: 'visible' | 'hidden') =>
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });

const run = async () => {
  renderHook(() => useDailyReminder());
  await vi.advanceTimersByTimeAsync(4100);
};
const saved = () => JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null');

beforeEach(() => {
  localStorage.clear();
  toast.mockReset();
  ensureUserKey.mockReset().mockResolvedValue('user');
  getProgressSummary.mockReset().mockResolvedValue({ learned_days: [], learned_count: 0 });
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  setVisibility('visible');
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('when a reminder is shown (J2, J3)', () => {
  it('shows one toast after 4 seconds when nothing was learned today', async () => {
    await run();
    expect(toast).toHaveBeenCalledTimes(1);
    expect(saved()).toMatchObject({ day: today, count: 1 });
  });

  it('does not show it before the initial delay', async () => {
    renderHook(() => useDailyReminder());
    await vi.advanceTimersByTimeAsync(3000);
    expect(toast).not.toHaveBeenCalled();
  });

  it('stays quiet when the learner already learned today', async () => {
    getProgressSummary.mockResolvedValue({ learned_days: [today], learned_count: 10 });
    await run();
    expect(toast).not.toHaveBeenCalled();
  });

  it('stops after 3 reminders in a day', async () => {
    localStorage.setItem(STATE_KEY, JSON.stringify({ day: today, count: 3, lastShownAt: 0 }));
    await run();
    expect(toast).not.toHaveBeenCalled();
  });

  it('waits at least 10 minutes between reminders', async () => {
    localStorage.setItem(STATE_KEY, JSON.stringify({ day: today, count: 1, lastShownAt: NOW.getTime() - 5 * 60_000 }));
    await run();
    expect(toast).not.toHaveBeenCalled();
    localStorage.setItem(STATE_KEY, JSON.stringify({ day: today, count: 1, lastShownAt: NOW.getTime() - 11 * 60_000 }));
    await run();
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('a new day resets the count', async () => {
    localStorage.setItem(STATE_KEY, JSON.stringify({ day: '2026-03-09', count: 3, lastShownAt: NOW.getTime() - 86_400_000 }));
    await run();
    expect(toast).toHaveBeenCalledTimes(1);
    expect(saved()).toMatchObject({ day: today, count: 1 });
  });

  it('survives a corrupt state', async () => {
    localStorage.setItem(STATE_KEY, '{bad');
    await run();
    expect(toast).toHaveBeenCalledTimes(1);
  });
});

describe('when data is missing', () => {
  it('does nothing without a user key or a summary, and does not crash on errors', async () => {
    ensureUserKey.mockResolvedValue(null);
    await run();
    ensureUserKey.mockRejectedValue(new Error('offline'));
    await run();
    ensureUserKey.mockResolvedValue('user');
    getProgressSummary.mockResolvedValue(null);
    await run();
    expect(toast).not.toHaveBeenCalled();
  });
});

describe('tab hidden (J4, J5)', () => {
  it('uses a system notification only when permission was granted', async () => {
    setVisibility('hidden');
    const Notification = Object.assign(vi.fn(), { permission: 'granted' });
    vi.stubGlobal('Notification', Notification);
    await run();
    expect(Notification).toHaveBeenCalledTimes(1);
    expect(toast).not.toHaveBeenCalled();
    expect(saved()).toMatchObject({ count: 1 });
  });

  it('shows nothing when permission is denied or not asked', async () => {
    setVisibility('hidden');
    for (const permission of ['denied', 'default']) {
      const Notification = Object.assign(vi.fn(), { permission });
      vi.stubGlobal('Notification', Notification);
      await run();
      expect(Notification).not.toHaveBeenCalled();
    }
    expect(toast).not.toHaveBeenCalled();
  });

  it('does not crash when Notification is unsupported (iOS) or throws', async () => {
    setVisibility('hidden');
    vi.stubGlobal('Notification', undefined);
    delete (window as unknown as { Notification?: unknown }).Notification;
    await run();
    const Throwing = Object.assign(
      vi.fn(() => {
        throw new TypeError('Illegal constructor');
      }),
      { permission: 'granted' }
    );
    vi.stubGlobal('Notification', Throwing);
    await run();
    expect(toast).not.toHaveBeenCalled();
  });
});
