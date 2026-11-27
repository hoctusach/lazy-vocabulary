/**
 * [FB-40] Days (local calendar dates) on which the user started studying on this device. Kept in its OWN storage key,
 * never inside the `progressSummary` cache: a local summary short-circuits the server fetch, which would hide the
 * server's learned_days. progressSummary unions these into what the streak sees.
 */
const KEY = 'lv.studyDays.v1';
const MAX_DAYS = 400;

export function readStudyDays(): string[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((d): d is string => typeof d === 'string' && d.length === 10) : [];
  } catch {
    return [];
  }
}

export function writeStudyDays(days: string[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(new Set(days)).sort().slice(-MAX_DAYS)));
    return true;
  } catch {
    return false;
  }
}
