/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { loadStreakDays, addStreakDay, STREAK_DAYS_KEY, USED_STREAK_DAYS_KEY } from '../src/utils/streak';

describe('streak days loading', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('filters out used streak days on load', () => {
    localStorage.setItem(STREAK_DAYS_KEY, JSON.stringify(['2024-07-01', '2024-07-03']));
    localStorage.setItem(USED_STREAK_DAYS_KEY, JSON.stringify(['2024-07-01', '2024-07-02']));

    const result = loadStreakDays();
    expect(result).toEqual(['2024-07-03']);
    expect(JSON.parse(localStorage.getItem(STREAK_DAYS_KEY)!)).toEqual(['2024-07-03']);
  });

  it('adds new streak day when not used', () => {
    localStorage.setItem(USED_STREAK_DAYS_KEY, JSON.stringify(['2024-07-01']));
    addStreakDay('2024-07-02');
    expect(loadStreakDays()).toEqual(['2024-07-02']);
  });
});
