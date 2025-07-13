export const STREAK_DAYS_KEY = 'streakDays';
export const USED_STREAK_DAYS_KEY = 'usedStreakDays';

export function loadStreakDays(): string[] {
  let streakDays: string[] = [];
  let usedDays: string[] = [];
  try {
    streakDays = JSON.parse(localStorage.getItem(STREAK_DAYS_KEY) || '[]');
  } catch {
    streakDays = [];
  }
  try {
    usedDays = JSON.parse(localStorage.getItem(USED_STREAK_DAYS_KEY) || '[]');
  } catch {
    usedDays = [];
  }
  const filtered = streakDays.filter(day => !usedDays.includes(day));
  if (filtered.length !== streakDays.length) {
    try {
      localStorage.setItem(STREAK_DAYS_KEY, JSON.stringify(filtered));
    } catch {}
  }
  return filtered;
}

export function addStreakDay(date: string): void {
  const current = loadStreakDays();
  if (!current.includes(date)) {
    current.push(date);
    try {
      localStorage.setItem(STREAK_DAYS_KEY, JSON.stringify(current));
    } catch {}
  }
}
