import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculateCurrentStreak, hasLearnedToday, getRecentDays } from '@/lib/progress/streak';

function isoDaysAgo(daysAgo: number, from = new Date('2024-06-15T12:00:00Z')): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

describe('calculateCurrentStreak', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 for no learned days', () => {
    expect(calculateCurrentStreak([])).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const days = [isoDaysAgo(0, now), isoDaysAgo(1, now), isoDaysAgo(2, now)];
    expect(calculateCurrentStreak(days)).toBe(3);
  });

  it('stops at the first gap', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const days = [isoDaysAgo(0, now), isoDaysAgo(1, now), isoDaysAgo(3, now)];
    expect(calculateCurrentStreak(days)).toBe(2);
  });

  it('returns 0 when today has not been learned yet, even with a past run', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const days = [isoDaysAgo(1, now), isoDaysAgo(2, now)];
    expect(calculateCurrentStreak(days)).toBe(0);
  });
});

describe('hasLearnedToday', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is true when today is in the list', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(hasLearnedToday([isoDaysAgo(0, now)])).toBe(true);
  });

  it('is false when today is missing', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(hasLearnedToday([isoDaysAgo(1, now)])).toBe(false);
  });
});

describe('getRecentDays', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the last N days oldest-first, marking learned + today', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const days = [isoDaysAgo(0, now), isoDaysAgo(2, now)];
    const recent = getRecentDays(days, 3);

    expect(recent).toHaveLength(3);
    expect(recent[0].date).toBe(isoDaysAgo(2, now));
    expect(recent[0].learned).toBe(true);
    expect(recent[1].learned).toBe(false);
    expect(recent[2].date).toBe(isoDaysAgo(0, now));
    expect(recent[2].learned).toBe(true);
    expect(recent[2].isToday).toBe(true);
  });
});
