/**
 * @vitest-environment node
 * Streak and "learned today" around the user's local midnight (D6, D7).
 * `it.fails` marks a known bug: the test passes while the bug exists and starts failing when it is fixed
 * (then change `it.fails` to `it`).
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateCurrentStreak, getRecentDays, hasLearnedToday } from '@/lib/progress/streak';

const originalTz = process.env.TZ;
afterAll(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const at = (tz: string, iso: string) => {
  process.env.TZ = tz;
  vi.setSystemTime(new Date(iso));
};

describe('UTC (works)', () => {
  it('counts today, yesterday and a gap', () => {
    at('UTC', '2026-11-26T10:00:00Z');
    expect(calculateCurrentStreak(['2026-11-26', '2026-11-25', '2026-11-24'])).toBe(3);
    expect(calculateCurrentStreak(['2026-11-25'])).toBe(0);
    expect(calculateCurrentStreak(['2026-11-26', '2026-11-24'])).toBe(1);
    expect(hasLearnedToday(['2026-11-26'])).toBe(true);
  });

  it('is capped at 366 days', () => {
    at('UTC', '2026-11-26T10:00:00Z');
    const days = Array.from({ length: 500 }, (_, i) => new Date(Date.UTC(2026, 10, 26 - i)).toISOString().slice(0, 10));
    expect(calculateCurrentStreak(days)).toBe(366);
  });
});

describe('time zones west of UTC (works)', () => {
  it('Los Angeles: local date is used', () => {
    at('America/Los_Angeles', '2026-11-26T03:00:00Z'); // 19:00 on the 25th in Los Angeles
    expect(hasLearnedToday(['2026-11-25'])).toBe(true);
    expect(calculateCurrentStreak(['2026-11-25'])).toBe(1);
  });
});

describe('time zones east of UTC, e.g. Vietnam (known bug)', () => {
  // 10:00 on 26 Nov in Ho Chi Minh City. The user learned today, so the learned day is 2026-11-26.
  it.fails('hasLearnedToday is true when the learned day is the local date', () => {
    at('Asia/Ho_Chi_Minh', '2026-11-26T03:00:00Z');
    expect(hasLearnedToday(['2026-11-26'])).toBe(true);
  });

  it.fails('the streak counts today', () => {
    at('Asia/Ho_Chi_Minh', '2026-11-26T03:00:00Z');
    expect(calculateCurrentStreak(['2026-11-26', '2026-11-25'])).toBe(2);
  });

  it.fails('the last day of the recent-days strip is the local date and marked as today', () => {
    at('Asia/Ho_Chi_Minh', '2026-11-26T03:00:00Z');
    const days = getRecentDays([], 7);
    expect(days[6]).toMatchObject({ date: '2026-11-26', isToday: true });
  });
});

describe('recent days strip', () => {
  it('has the requested length, oldest first, ending today (UTC)', () => {
    at('UTC', '2026-03-01T12:00:00Z');
    const days = getRecentDays(['2026-02-28'], 7);
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe('2026-02-23');
    expect(days[6]).toMatchObject({ date: '2026-03-01', isToday: true });
    expect(days.find((d) => d.date === '2026-02-28')?.learned).toBe(true);
  });

  it('crosses a leap day', () => {
    at('UTC', '2028-03-02T12:00:00Z');
    expect(getRecentDays([], 4).map((d) => d.date)).toEqual(['2028-02-28', '2028-02-29', '2028-03-01', '2028-03-02']);
  });
});
