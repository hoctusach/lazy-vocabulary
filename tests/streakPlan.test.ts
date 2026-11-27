import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateCurrentStreak, getRecentDays, hasLearnedToday } from '@/lib/progress/streak';

const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n: number, from: Date) => {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return key(d);
};

describe('PROG-10: streak calculation', () => {
  afterEach(() => vi.useRealTimers());

  const freeze = (iso: string) => {
    const now = new Date(iso);
    vi.useFakeTimers();
    vi.setSystemTime(now);
    return now;
  };

  it('empty, today only, yesterday only, and a gap', () => {
    const now = freeze('2024-06-15T12:00:00');
    expect(calculateCurrentStreak([])).toBe(0);
    expect(calculateCurrentStreak([daysAgo(0, now)])).toBe(1);
    expect(calculateCurrentStreak([daysAgo(1, now)])).toBe(0);
    expect(calculateCurrentStreak([daysAgo(0, now), daysAgo(1, now), daysAgo(3, now)])).toBe(2);
  });

  it('late evening local time (23:30) still counts the local date, whatever the UTC offset', () => {
    const now = freeze('2024-06-15T23:30:00');
    expect(hasLearnedToday(['2024-06-15'])).toBe(true);
    expect(calculateCurrentStreak(['2024-06-15', '2024-06-14'])).toBe(2);
    const recent = getRecentDays(['2024-06-15'], 2);
    expect(recent.map((d) => d.date)).toEqual(['2024-06-14', '2024-06-15']);
    expect(recent[1].isToday).toBe(true);
    expect(key(now)).toBe('2024-06-15');
  });

  it('just after local midnight (00:30) is the new day', () => {
    freeze('2024-06-16T00:30:00');
    expect(hasLearnedToday(['2024-06-15'])).toBe(false);
    expect(hasLearnedToday(['2024-06-16'])).toBe(true);
  });

  it('crosses a month boundary', () => {
    freeze('2024-03-01T09:00:00');
    expect(calculateCurrentStreak(['2024-03-01', '2024-02-29', '2024-02-28'])).toBe(3);
  });
});
