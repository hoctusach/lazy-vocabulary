/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadStreakDays, addStreakDay, STREAK_DAYS_KEY, USED_STREAK_DAYS_KEY } from '../src/utils/streak';

describe('streak days loading', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('filters out used streak days on load', () => {
    vi.setSystemTime(new Date('2024-07-04T00:00:00Z'));
    localStorage.setItem(STREAK_DAYS_KEY, JSON.stringify(['2024-07-01', '2024-07-03']));
    localStorage.setItem(USED_STREAK_DAYS_KEY, JSON.stringify(['2024-07-01', '2024-07-02']));

    const result = loadStreakDays();
    expect(result).toEqual(['2024-07-03']);
    expect(JSON.parse(localStorage.getItem(STREAK_DAYS_KEY)!)).toEqual(['2024-07-03']);
  });

  it('adds new streak day when not used', () => {
    vi.setSystemTime(new Date('2024-07-02T00:00:00Z'));
    localStorage.setItem(USED_STREAK_DAYS_KEY, JSON.stringify(['2024-07-01']));
    addStreakDay('2024-07-02');
    expect(loadStreakDays()).toEqual(['2024-07-02']);
  });

  it('resets streak if last date is older than yesterday', () => {
    vi.setSystemTime(new Date('2024-07-12T00:00:00Z'));
    localStorage.setItem(STREAK_DAYS_KEY, JSON.stringify(['2024-07-08','2024-07-09','2024-07-10']));
    expect(loadStreakDays()).toEqual([]);
  });

  it('keeps streak when continuous up to yesterday', () => {
    vi.setSystemTime(new Date('2024-07-12T00:00:00Z'));
    localStorage.setItem(STREAK_DAYS_KEY, JSON.stringify(['2024-07-10','2024-07-11']));
    expect(loadStreakDays()).toEqual(['2024-07-10','2024-07-11']);
  });
});
