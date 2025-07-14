export const STREAK_DAYS_KEY = 'streakDays';
export const USED_STREAK_DAYS_KEY = 'usedStreakDays';

function dayDiff(a: Date, b: Date): number {
  const ms = 24 * 60 * 60 * 1000;
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((da.getTime() - db.getTime()) / ms);
}

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
  let filtered = streakDays.filter(day => !usedDays.includes(day));
  if (filtered.length !== streakDays.length) {
    try {
      localStorage.setItem(STREAK_DAYS_KEY, JSON.stringify(filtered));
    } catch {}
  }

  if (filtered.length > 0) {
    const today = new Date();
    const last = new Date(filtered[filtered.length - 1]);
    if (dayDiff(today, last) > 1) {
      filtered = [];
    } else {
      for (let i = filtered.length - 1; i > 0; i--) {
        const cur = new Date(filtered[i]);
        const prev = new Date(filtered[i - 1]);
        if (dayDiff(cur, prev) !== 1) {
          filtered = [];
          break;
        }
      }
    }
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
