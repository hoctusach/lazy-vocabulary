import type { PracticeAttempt } from './types';

const PRACTICE_HISTORY_KEY = 'lazyvoca.practice.history.v1';

export function loadPracticeHistory(): PracticeAttempt[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(PRACTICE_HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePracticeAttempt(attempt: PracticeAttempt): PracticeAttempt[] {
  const next = [attempt, ...loadPracticeHistory()].slice(0, 100);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(PRACTICE_HISTORY_KEY, JSON.stringify(next));
  }
  return next;
}
