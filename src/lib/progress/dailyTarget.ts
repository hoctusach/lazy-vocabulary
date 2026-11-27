/**
 * [FB-51] Daily size rule (no imports, so every layer can share it).
 *
 * Today's total = active words (new + due still in the list) + words marked learned TODAY, and the target is 20.
 * Marking a word learned moves it from NEW/DUE to LEARNED-today but it still counts, so the day never looks short and
 * a day that already reached 20 never shrinks or grows. Only when learning most of the list would leave fewer than
 * MIN_ACTIVE words to study, a few more are added ("a little over 20"), never past MAX_TOTAL (the server's per-call cap).
 */
export const DAILY_TARGET = 20;
export const MIN_ACTIVE = 10;
export const MAX_TOTAL = 25;

/** Active (new + due) words wanted today, given how many were already learned today. */
export function activeTarget(learnedToday: number): number {
  const learned = Math.max(0, Math.trunc(learnedToday) || 0);
  return Math.max(0, Math.min(Math.max(DAILY_TARGET - learned, MIN_ACTIVE), MAX_TOTAL - learned));
}

/** Total (active + learned today) the day should reach. */
export function dailyTarget(learnedToday: number): number {
  return activeTarget(learnedToday) + Math.max(0, Math.trunc(learnedToday) || 0);
}

/** How many more words today needs. 0 when active + learnedToday already reaches the target (never shrinks). */
export function topUpNeeded(active: number, learnedToday: number): number {
  return Math.max(0, activeTarget(learnedToday) - Math.max(0, active));
}
