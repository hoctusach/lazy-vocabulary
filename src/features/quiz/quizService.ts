import { getLocalDateISO } from '@/utils/date';

const QUIZ_DONE_KEY = 'lazyVoca.quiz.lastCompletedDay';

function todayKey(): string {
  return getLocalDateISO();
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
