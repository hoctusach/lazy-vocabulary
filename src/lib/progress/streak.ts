import { getLocalDateISO } from '@/utils/date';

/** The learner's local calendar day (not the UTC day, which is the previous day in time zones east of UTC). */
function todayKey(date = new Date()): string {
  return getLocalDateISO(date);
}

/** A date at local noon, so adding or removing days never lands on a different day because of daylight saving. */
function localNoon(date = new Date()): Date {
  const cursor = new Date(date);
  cursor.setHours(12, 0, 0, 0);
  return cursor;
}

export function calculateCurrentStreak(days: string[]): number {
  if (days.length === 0) return 0;

  const learnedDays = new Set(days);
  const cursor = localNoon();

  let streak = 0;
  while (streak < 366) {
    const key = getLocalDateISO(cursor);
    if (!learnedDays.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function hasLearnedToday(days: string[]): boolean {
  return days.includes(todayKey());
}

export type RecentDay = {
  date: string;
  learned: boolean;
  isToday: boolean;
};

/** Last `count` days ending today, oldest first — for a streak dot strip. */
export function getRecentDays(days: string[], count = 7): RecentDay[] {
  const learnedDays = new Set(days);
  const today = todayKey();
  const result: RecentDay[] = [];
  const cursor = localNoon();
  cursor.setDate(cursor.getDate() - (count - 1));

  for (let i = 0; i < count; i += 1) {
    const key = getLocalDateISO(cursor);
    result.push({ date: key, learned: learnedDays.has(key), isToday: key === today });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}
