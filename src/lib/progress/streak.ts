function todayKey(date = new Date()): string {
  const cursor = new Date(date);
  cursor.setHours(0, 0, 0, 0);
  return cursor.toISOString().slice(0, 10);
}

export function calculateCurrentStreak(days: string[]): number {
  if (days.length === 0) return 0;

  const learnedDays = new Set(days);
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  let streak = 0;
  while (streak < 366) {
    const key = cursor.toISOString().slice(0, 10);
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
    const key = cursor.toISOString().slice(0, 10);
    result.push({ date: key, learned: learnedDays.has(key), isToday: key === today });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}
