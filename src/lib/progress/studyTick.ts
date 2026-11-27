import { todayKey } from '@/lib/progress/streak';
import { readStudyDays, writeStudyDays } from '@/lib/progress/studyDays';

/** Fired on `window` after today's local date was newly added to the study days. */
export const STUDY_TICK_EVENT = 'lv:study-tick';

/**
 * [FB-40] Tick today's LOCAL calendar date the moment studying starts (app open with a word, first word played /
 * reviewed, mark learned), so the streak strip updates without a reload and without a full "mark as learned".
 * Idempotent: returns false when today is already there. The streak reads these days unioned with the server's
 * learned_days (see progressSummary).
 */
export function tickStudyToday(now: Date = new Date()): boolean {
  const day = todayKey(now);
  const days = readStudyDays();
  if (days.includes(day)) return false;
  writeStudyDays([...days, day]);
  try {
    window.dispatchEvent(new CustomEvent(STUDY_TICK_EVENT, { detail: { day } }));
  } catch {
    // non-browser environment
  }
  return true;
}
