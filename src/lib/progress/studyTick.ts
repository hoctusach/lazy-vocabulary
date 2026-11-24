import { todayKey } from '@/lib/progress/streak';
import {
  persistProgressSummaryLocal,
  readProgressSummaryLocal,
  type ProgressSummaryFields,
} from '@/lib/progress/progressSummary';

/** Fired on `window` after today's local date was newly added to learned_days. */
export const STUDY_TICK_EVENT = 'lv:study-tick';

/**
 * [FB-40] Tick today's LOCAL calendar date into learned_days the moment studying starts (first word
 * played / reviewed / marked learned), so the streak strip updates without a reload and without
 * needing a full "mark as learned". Idempotent: returns false when today is already there.
 * The server summary keeps its own days; refreshProgressSummary unions them with this local list.
 */
export function tickStudyToday(now: Date = new Date()): boolean {
  const day = todayKey(now);
  const local = readProgressSummaryLocal();
  const days = Array.isArray(local?.learned_days) ? (local!.learned_days as string[]) : [];
  if (days.includes(day)) return false;

  const next: ProgressSummaryFields = {
    learning_count: local?.learning_count ?? 0,
    learned_count: local?.learned_count ?? 0,
    learning_due_count: local?.learning_due_count ?? 0,
    remaining_count: local?.remaining_count ?? 0,
    learning_time: local?.learning_time ?? 0,
    learned_days: [...days, day].sort(),
    updated_at: local?.updated_at ?? null,
  };
  persistProgressSummaryLocal(next);
  try {
    window.dispatchEvent(new CustomEvent(STUDY_TICK_EVENT, { detail: { day } }));
  } catch {
    // non-browser environment
  }
  return true;
}
