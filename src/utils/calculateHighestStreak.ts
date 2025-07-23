export interface ActivityDay {
  date: string;
  isRedeemed: boolean;
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(n => parseInt(n, 10));
  return new Date(y, m - 1, d);
}

function dayDiff(a: string, b: string): number {
  const ms = 24 * 60 * 60 * 1000;
  return Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / ms);
}

export interface HighestStreakResult {
  highestStreak: number;
  streakDates: string[];
}

export function calculateHighestStreak(days: ActivityDay[]): HighestStreakResult {
  if (!Array.isArray(days) || days.length === 0) {
    return { highestStreak: 0, streakDates: [] };
  }

  const sorted = [...days].sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

  let bestLength = 0;
  let bestDates: string[] = [];

  let currentLength = 0;
  let currentDates: string[] = [];
  let lastDate: string | null = null;

  for (const day of sorted) {
    if (!day.isRedeemed) {
      if (currentLength > 0 && lastDate && dayDiff(day.date, lastDate) === 1) {
        currentLength += 1;
        currentDates.push(day.date);
      } else {
        currentLength = 1;
        currentDates = [day.date];
      }

      if (currentLength > bestLength) {
        bestLength = currentLength;
        bestDates = [...currentDates];
      }
    } else {
      currentLength = 0;
      currentDates = [];
    }

    lastDate = day.date;
  }

  return { highestStreak: bestLength, streakDates: bestDates };
}
