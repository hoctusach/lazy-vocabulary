// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tickStudyToday, STUDY_TICK_EVENT } from '@/lib/progress/studyTick';
import { calculateCurrentStreak, todayKey } from '@/lib/progress/streak';
import { readFileSync } from 'node:fs';

// [FB-40] Streak: today's LOCAL calendar date is written as soon as studying starts.
// vitest runs this file under the machine TZ; the date math below is TZ-independent (compares to local getters).
const local = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const days = () => JSON.parse(localStorage.getItem('progressSummary') || '{}').learned_days as string[];

describe('[FB-40] streak tick', () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it('writes the local date, not the UTC date (00:30 and 19:00 local)', () => {
    for (const [h, m] of [[0, 30], [19, 0], [23, 50]]) {
      localStorage.clear();
      const now = new Date(2026, 10, 24, h, m);
      vi.setSystemTime(now);
      expect(tickStudyToday()).toBe(true);
      expect(days()).toEqual([local(now)]);
      expect(todayKey()).toBe(local(now));
    }
  });

  it('is idempotent: second event does not duplicate and does not re-fire', () => {
    vi.setSystemTime(new Date(2026, 10, 24, 8, 0));
    const spy = vi.fn();
    window.addEventListener(STUDY_TICK_EVENT, spy);
    expect(tickStudyToday()).toBe(true);
    expect(tickStudyToday()).toBe(false);
    expect(days()).toHaveLength(1);
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener(STUDY_TICK_EVENT, spy);
  });

  it('keeps earlier days and today joins the streak immediately', () => {
    vi.setSystemTime(new Date(2026, 10, 24, 8, 0));
    localStorage.setItem('progressSummary', JSON.stringify({ learned_days: ['2026-11-22', '2026-11-23'] }));
    expect(calculateCurrentStreak(days())).toBe(0); // before the tick today is missing
    tickStudyToday();
    expect(calculateCurrentStreak(days())).toBe(3);
  });

  it('the usage tracker no longer writes UTC day keys', () => {
    const src = readFileSync('src/hooks/useDailyUsageTracker.tsx', 'utf8') + readFileSync('src/hooks/useDailyReminder.ts', 'utf8');
    expect(src).not.toMatch(/toISOString\(\)\.slice\(0, ?10\)/);
  });
});
