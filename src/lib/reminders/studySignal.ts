/**
 * "Studied today" signal for local reminders. The progress summary's learned_days
 * is stamped just by opening the app, so it can't tell a real study action from a
 * launch; reminders need an explicit signal: first word played, marked, or quiz answered.
 */
export type StudyKind = 'play' | 'mark' | 'quiz';

export const STUDIED_KEY = 'lazyVoca.reminders.studiedDay';
export const STUDIED_EVENT = 'lv:studied';

/** Device-local calendar day, YYYY-MM-DD. */
export function localDayKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function hasStudiedToday(now: Date = new Date()): boolean {
  try {
    return localStorage.getItem(STUDIED_KEY) === localDayKey(now);
  } catch {
    return false;
  }
}

/** Record a study action; emits STUDIED_EVENT every time so listeners can react to the kind. */
export function markStudiedToday(kind: StudyKind, now: Date = new Date()): void {
  const first = !hasStudiedToday(now);
  try {
    localStorage.setItem(STUDIED_KEY, localDayKey(now));
  } catch {
    // ignore storage failures
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STUDIED_EVENT, { detail: { kind, first } }));
  }
}
