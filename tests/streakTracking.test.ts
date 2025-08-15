/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadStreakDays, addStreakDay, STREAK_DAYS_KEY, USED_STREAK_DAYS_KEY, redeemBadge } from '../src/utils/streak';

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

  it('unlocks badge at milestone and resets streak', () => {
    for (let i = 1; i <= 5; i++) {
      const date = `2024-07-0${i}`;
      vi.setSystemTime(new Date(`${date}T00:00:00Z`));
      addStreakDay(date);
    }

    const badges = JSON.parse(localStorage.getItem('badges') || '{}');
    expect(badges['5_day_streak']).toBe(true);

    expect(JSON.parse(localStorage.getItem(STREAK_DAYS_KEY)!)).toEqual([]);

    expect(JSON.parse(localStorage.getItem(USED_STREAK_DAYS_KEY)!)).toEqual([
      '2024-07-01',
      '2024-07-02',
      '2024-07-03',
      '2024-07-04',
      '2024-07-05'
    ]);

    expect(JSON.parse(localStorage.getItem('redeemableStreaks') || '{}')).toEqual({
      '5_day_streak': [
        '2024-07-01',
        '2024-07-02',
        '2024-07-03',
        '2024-07-04',
        '2024-07-05'
      ]
    });
  });

  it('allows redeeming a badge', () => {
    localStorage.setItem('redeemableStreaks', JSON.stringify({
      '5_day_streak': ['2024-07-01']
    }));
    redeemBadge('5_day_streak');
    expect(JSON.parse(localStorage.getItem('redeemableStreaks') || '{}')).toEqual({});
  });

  it('does not reuse days across milestones', () => {
    for (let i = 1; i <= 5; i++) {
      const date = `2024-07-0${i}`;
      vi.setSystemTime(new Date(`${date}T00:00:00Z`));
      addStreakDay(date);
    }

    for (let i = 6; i <= 10; i++) {
      const date = `2024-07-${i < 10 ? '0' + i : i}`;
      vi.setSystemTime(new Date(`${date}T00:00:00Z`));
      addStreakDay(date);
    }

    const used = JSON.parse(localStorage.getItem(USED_STREAK_DAYS_KEY) || '[]');
    expect(used).toEqual([
      '2024-07-01',
      '2024-07-02',
      '2024-07-03',
      '2024-07-04',
      '2024-07-05',
      '2024-07-06',
      '2024-07-07',
      '2024-07-08',
      '2024-07-09',
      '2024-07-10'
    ]);
  });

  it('removes overlapping lower redeemable streaks', () => {
    vi.setSystemTime(new Date('2024-07-10T00:00:00Z'));
    localStorage.setItem('redeemableStreaks', JSON.stringify({
      '5_day_streak': [
        '2024-07-01',
        '2024-07-02',
        '2024-07-03',
        '2024-07-04',
        '2024-07-05'
      ]
    }));
    localStorage.setItem(
      STREAK_DAYS_KEY,
      JSON.stringify([
        '2024-07-01',
        '2024-07-02',
        '2024-07-03',
        '2024-07-04',
        '2024-07-05',
        '2024-07-06',
        '2024-07-07',
        '2024-07-08',
        '2024-07-09'
      ])
    );

    addStreakDay('2024-07-10');

    expect(JSON.parse(localStorage.getItem('redeemableStreaks') || '{}')).toEqual({
      '10_day_streak': [
        '2024-07-01',
        '2024-07-02',
        '2024-07-03',
        '2024-07-04',
        '2024-07-05',
        '2024-07-06',
        '2024-07-07',
        '2024-07-08',
        '2024-07-09',
        '2024-07-10'
      ]
    });
  });
});
