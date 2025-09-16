import { ensureUserKey } from '@/lib/progress/srsSyncByUserKey';
import { getSupabaseClient } from '../supabaseClient';

const UPDATED_AT_FIELD = () => ({ updated_at: new Date().toISOString() });

type ResumeRow = { category: string; last_word_key: string | null; last_seen_at?: string };

export async function upsertResume(_nickname: string, rows: ResumeRow[]) {
  const supabase = getSupabaseClient();
  if (!supabase || rows.length === 0) return;
  const user_unique_key = await ensureUserKey();
  if (!user_unique_key) return;
  const payload = rows.map(row => ({
    user_unique_key,
    category: row.category,
    last_word_key: row.last_word_key,
    last_seen_at: row.last_seen_at ?? null,
    ...UPDATED_AT_FIELD(),
  }));
  return supabase
    .from('resume_state')
    .upsert(payload, { onConflict: 'user_unique_key,category' });
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
  const supabase = getSupabaseClient();
  if (!supabase || rows.length === 0) return;
  const user_unique_key = await ensureUserKey();
  if (!user_unique_key) return;
  const payload = rows.map(row => ({
    user_unique_key,
    word_key: row.word_key,
    category: row.category ?? null,
    status: row.status ?? null,
    review_count: row.review_count ?? null,
    next_review_at: row.next_review_at ?? null,
    learned_at: row.learned_at ?? null,
    ...UPDATED_AT_FIELD(),
  }));
  return supabase
    .from('learning_progress')
    .upsert(payload, { onConflict: 'user_unique_key,word_key' });
}

export async function upsertDailySelection(_nickname: string, dayISO: string, selection: unknown) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const user_unique_key = await ensureUserKey();
  if (!user_unique_key) return;
  const safeDay = dayISO?.slice(0, 10) ?? null;
  if (!safeDay || !selection) return;
  const row = {
    user_unique_key,
    selection_date: safeDay,
    selection_json: selection,
    ...UPDATED_AT_FIELD(),
  };
  return supabase
    .from('daily_selection')
    .upsert(row, { onConflict: 'user_unique_key,selection_date' });
}

export async function upsertLearningTime(
  _nickname: string,
  rows: Array<{ dayISO: string; duration_ms: number }>
) {
  const supabase = getSupabaseClient();
  if (!supabase || rows.length === 0) return;
  const user_unique_key = await ensureUserKey();
  if (!user_unique_key) return;
  const payload = rows
    .map(r => ({
      user_unique_key,
      day_iso: r.dayISO?.slice(0, 10) ?? null,
      duration_ms: Math.max(0, Math.floor(r.duration_ms ?? 0)),
      ...UPDATED_AT_FIELD(),
    }))
    .filter(row => row.day_iso);
  if (!payload.length) return;
  return supabase
    .from('learning_time')
    .upsert(payload, { onConflict: 'user_unique_key,day_iso' });
}

export async function upsertWordCounts(
  _nickname: string,
  rows: Array<{ word_key: string; count: number; last_shown_at?: string }>
) {
  const supabase = getSupabaseClient();
  if (!supabase || rows.length === 0) return;
  const user_unique_key = await ensureUserKey();
  if (!user_unique_key) return;
  const payload = rows.map(r => ({
    user_unique_key,
    word_key: r.word_key,
    count: Math.max(0, Math.floor(r.count ?? 0)),
    last_shown_at: r.last_shown_at ?? null,
    ...UPDATED_AT_FIELD(),
  }));
  return supabase
    .from('word_counts')
    .upsert(payload, { onConflict: 'user_unique_key,word_key' });
}
