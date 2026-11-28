/** Days between reviews of a word, by review number (1st review, 2nd review...). */
export const REVIEW_INTERVALS_DAYS = [1, 2, 3, 5, 7, 10, 14, 21, 28, 35];

/** Once a word is learned it comes back for review after this many days. Shown in the Mark as Learned dialog. */
export const MASTER_INTERVAL_DAYS = 60;

/**
 * [FB-70] Date key (YYYY-MM-DD) of a word's first review, computed exactly like
 * `calculateNextReviewDate(1, from)` in learningProgressService (REVIEW_INTERVALS_DAYS[0], UTC date key).
 * Display only: used by Word Summary for NEW TODAY words, which have no SRS row yet.
 */
export function firstReviewDateKey(from: Date = new Date()): string {
  const next = new Date(from);
  next.setDate(next.getDate() + REVIEW_INTERVALS_DAYS[0]);
  return next.toISOString().slice(0, 10);
}
