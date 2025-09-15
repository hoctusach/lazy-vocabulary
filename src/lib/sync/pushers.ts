import { getSupabaseClient } from '../supabaseClient';

export async function upsertResume(name: string, rows: Array<{category: string; last_word_key: string|null; last_seen_at?: string}>) {
  const supabase = getSupabaseClient();
  const payload = rows.map(r => ({ name, ...r, updated_at: new Date().toISOString() }));
  // onConflict columns must match PK
  return supabase.from('resume_state').upsert(payload, { onConflict: 'name,category' });
}

export async function upsertProgress(
  name: string,
  rows: Array<{
    word_key: string;
    category?: string | null;
    status?: number | string | null;
    review_count?: number;
    next_review_at?: string | null;
    learned_at?: string | null;
  }>
) {
  const supabase = getSupabaseClient();
  const payload = rows.map(r => ({ name, ...r, updated_at: new Date().toISOString() }));
  return supabase.from('learning_progress').upsert(payload, { onConflict: 'name,word_key' });
}

export async function upsertDailySelection(name: string, dayISO: string, selection: unknown) {
  const supabase = getSupabaseClient();
  const row = { name, day: dayISO.slice(0,10), selection_json: selection, updated_at: new Date().toISOString() };
  return supabase.from('daily_selection').upsert(row, { onConflict: 'name,day' });
}

export async function upsertLearningTime(name: string, rows: Array<{dayISO: string; duration_ms: number}>) {
  const supabase = getSupabaseClient();
  const payload = rows.map(r => ({ name, day: r.dayISO.slice(0,10), duration_ms: Math.max(0, Math.floor(r.duration_ms)), updated_at: new Date().toISOString() }));
  return supabase.from('learning_time').upsert(payload, { onConflict: 'name,day' });
}

export async function upsertWordCounts(name: string, rows: Array<{word_key: string; count: number; last_shown_at?: string}>) {
  const supabase = getSupabaseClient();
  const payload = rows.map(r => ({ name, ...r, updated_at: new Date().toISOString() }));
  return supabase.from('word_counts').upsert(payload, { onConflict: 'name,word_key' });
}
