const QUIZ_DONE_KEY = 'lazyVoca.quiz.lastCompletedDay';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function hasCompletedQuizToday(): boolean {
  try {
    return localStorage.getItem(QUIZ_DONE_KEY) === todayKey();
  } catch {
    return false;
  }
}

export function markQuizCompletedToday(): void {
  try {
    localStorage.setItem(QUIZ_DONE_KEY, todayKey());
  } catch {
    // ignore storage failures
  }
}

/** Free users get this many quiz sessions per local calendar day; Pro is unlimited. */
export const FREE_QUIZZES_PER_DAY = 1;
const QUIZ_DAILY_KEY = 'lazyVoca.quiz.daily.v1';

/** Device-local calendar day, e.g. "2026-11-21" (not UTC). */
export function localDayKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function quizSessionsToday(now: Date = new Date()): number {
  try {
    const raw = localStorage.getItem(QUIZ_DAILY_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { date?: unknown; count?: unknown };
    if (parsed.date === localDayKey(now) && typeof parsed.count === 'number') return parsed.count;
  } catch {
    // unreadable / blocked storage: treat as no sessions yet
  }
  return 0;
}

/** False once a non-Pro user has used today's free session(s). */
export function canStartQuiz(unlimited: boolean, now: Date = new Date()): boolean {
  return unlimited || quizSessionsToday(now) < FREE_QUIZZES_PER_DAY;
}

/** Count a session (call when a quiz actually starts). */
export function recordQuizStart(now: Date = new Date()): void {
  try {
    localStorage.setItem(QUIZ_DAILY_KEY, JSON.stringify({ date: localDayKey(now), count: quizSessionsToday(now) + 1 }));
  } catch {
    // ignore storage failures
  }
}
