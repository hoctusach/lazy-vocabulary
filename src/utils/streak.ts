export const STREAK_DAYS_KEY = 'streakDays';
export const USED_STREAK_DAYS_KEY = 'usedStreakDays';
export const BADGES_KEY = 'badges';
export const REDEEMABLE_STREAKS_KEY = 'redeemableStreaks';

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
  filtered = Array.from(new Set(filtered));
  if (filtered.length !== streakDays.length) {
    try {
      localStorage.setItem(STREAK_DAYS_KEY, JSON.stringify(filtered));
    } catch { /* ignore */ }
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
    } catch { /* ignore */ }
  }

  return filtered;
}

export function addStreakDay(date: string): void {
  const current = loadStreakDays();
  if (!current.includes(date)) {
    current.push(date);
    try {
      localStorage.setItem(STREAK_DAYS_KEY, JSON.stringify(current));
    } catch { /* ignore */ }
    handleStreakMilestone(current);
  }
}

const MILESTONES = [5, 10, 15, 20, 30];

function handleStreakMilestone(days: string[]): void {
  if (!MILESTONES.includes(days.length)) {
    return;
  }

  const count = days.length;

  try {
    const badges = JSON.parse(localStorage.getItem(BADGES_KEY) || '{}');
    badges[`${count}_day_streak`] = true;
    localStorage.setItem(BADGES_KEY, JSON.stringify(badges));
  } catch { /* ignore */ }

  try {
    const used = JSON.parse(localStorage.getItem(USED_STREAK_DAYS_KEY) || '[]');
    const updated = Array.from(new Set(used.concat(days)));
    localStorage.setItem(USED_STREAK_DAYS_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }

  try {
    localStorage.setItem(STREAK_DAYS_KEY, JSON.stringify([]));
  } catch { /* ignore */ }

  try {
    const redeem: Record<string, string[]> = JSON.parse(
      localStorage.getItem(REDEEMABLE_STREAKS_KEY) || '{}'
    );
    for (const key of Object.keys(redeem)) {
      const match = key.match(/^(\d+)_day_streak$/);
      if (match && parseInt(match[1], 10) < count) {
        const oldDays: string[] = redeem[key];
        if (oldDays.some(d => days.includes(d))) {
          delete redeem[key];
        }
      }
    }
    redeem[`${count}_day_streak`] = days;
    localStorage.setItem(REDEEMABLE_STREAKS_KEY, JSON.stringify(redeem));
  } catch { /* ignore */ }
}

export function redeemBadge(badgeKey: string): void {
  try {
    const redeem = JSON.parse(localStorage.getItem(REDEEMABLE_STREAKS_KEY) || '{}');
    if (redeem[badgeKey]) {
      delete redeem[badgeKey];
      localStorage.setItem(REDEEMABLE_STREAKS_KEY, JSON.stringify(redeem));
    }
  } catch { /* ignore */ }
}
