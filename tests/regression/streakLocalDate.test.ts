import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculateCurrentStreak, hasLearnedToday } from '@/lib/progress/streak';

const origTz = process.env.TZ;
afterEach(() => {
  vi.useRealTimers();
  if (origTz === undefined) delete process.env.TZ; else process.env.TZ = origTz;
});

describe('[FB-17] streak uses the local calendar date, not UTC', () => {
  it('east of UTC just after local midnight: today is the local date (UTC+7)', () => {
    process.env.TZ = 'Asia/Ho_Chi_Minh';
    // 2024-06-14 18:30 UTC == 2024-06-15 01:30 in Saigon; the UTC date is still the 14th.
    vi.useFakeTimers({ now: new Date('2024-06-14T18:30:00Z') });
    expect(new Date().getDate()).toBe(15); // guards that the TZ switch took effect
    expect(hasLearnedToday(['2024-06-15'])).toBe(true);
    expect(hasLearnedToday(['2024-06-14'])).toBe(false);
    expect(calculateCurrentStreak(['2024-06-15', '2024-06-14', '2024-06-13'])).toBe(3);
  });
});
