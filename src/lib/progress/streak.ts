/** Local calendar date as YYYY-MM-DD (not UTC, which is off by a day east of Greenwich). */
function localKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayKey(date = new Date()): string {
  return localKey(date);
}

export function calculateCurrentStreak(days: string[]): number {
  if (days.length === 0) return 0;

  const learnedDays = new Set(days);
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  let streak = 0;
  while (streak < 366) {
    const key = localKey(cursor);
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
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (count - 1));

  for (let i = 0; i < count; i += 1) {
    const key = localKey(cursor);
    result.push({ date: key, learned: learnedDays.has(key), isToday: key === today });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}
