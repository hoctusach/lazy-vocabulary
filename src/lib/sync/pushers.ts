/**
 * The legacy pushers wrote into tables that no longer exist in the current
 * Supabase schema. To avoid runtime errors we keep the public API but make the
 * operations explicit no-ops. Downstream callers can still await these
 * functions, but nothing will be written to Supabase until a replacement sync
 * story is designed.
 */

function warnDisabled(feature: string): void {
  if (typeof console !== 'undefined') {
    console.warn(`[sync:${feature}] remote sync disabled – table removed from schema.`);
  }
}

type ResumeRow = { category: string; last_word_key: string | null; last_seen_at?: string };

export async function upsertResume(_nickname: string, rows: ResumeRow[]) {
  if (rows.length > 0) warnDisabled('resume');
  return Promise.resolve();
}

type ProgressRow = {
  word_key: string;
  category?: string | null;
  status?: number | string | null;
  review_count?: number;
  next_review_at?: string | null;
  learned_at?: string | null;
};

export async function upsertProgress(_nickname: string, rows: ProgressRow[]) {
  if (rows.length > 0) warnDisabled('progress');
  return Promise.resolve();
}

export async function upsertDailySelection(_nickname: string, dayISO: string, selection: unknown) {
  if (dayISO && selection) warnDisabled('daily-selection');
  return Promise.resolve();
}

export async function upsertLearningTime(
  _nickname: string,
  rows: Array<{ dayISO: string; duration_ms: number }>
) {
  if (rows.length > 0) warnDisabled('learning-time');
  return Promise.resolve();
}

export async function upsertWordCounts(
  _nickname: string,
  rows: Array<{ word_key: string; count: number; last_shown_at?: string }>
) {
  if (rows.length > 0) warnDisabled('word-counts');
  return Promise.resolve();
}
