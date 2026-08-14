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
