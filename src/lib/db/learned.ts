import { getSupabaseClient } from '@/lib/supabaseClient';
import type { LearnedWord } from '@/core/models';
import { ensureUserKey } from '@/lib/progress/srsSyncByUserKey';
import { recalcProgressSummary } from '@/lib/progress/progressSummary';

export type LearnedWordUpsert = {
  in_review_queue: boolean;
  review_count?: number | null;
  learned_at?: string | null;
  last_review_at?: string | null;
  next_review_at?: string | null;
  next_display_at?: string | null;
  last_seen_at?: string | null;
  srs_interval_days?: number | null;
  srs_easiness?: number | null;
  srs_state?: string | null;
};

function normaliseISO(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function normaliseDateOnly(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

function normaliseNumber(value?: number | null): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function normaliseText(value?: string | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function getLearned(): Promise<LearnedWord[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const user_unique_key = await ensureUserKey();
  if (!user_unique_key) return [];
  const { data, error } = await supabase
    .from('learned_words')
    .select('*')
    .eq('user_unique_key', user_unique_key);
  if (error) throw error;
  return data || [];
}

export async function upsertLearned(
  wordId: string,
  payload: LearnedWordUpsert
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const user_unique_key = await ensureUserKey();
  if (!user_unique_key) return;
  const record = {
    user_unique_key,
    word_id: wordId,
    in_review_queue: payload.in_review_queue,
    review_count: normaliseNumber(payload.review_count),
    learned_at: normaliseISO(payload.learned_at),
    last_review_at: normaliseISO(payload.last_review_at),
    next_review_at: normaliseDateOnly(payload.next_review_at),
    next_display_at: normaliseISO(payload.next_display_at),
    last_seen_at: normaliseISO(payload.last_seen_at),
    srs_interval_days: normaliseNumber(payload.srs_interval_days),
    srs_easiness: normaliseNumber(payload.srs_easiness),
    srs_state: normaliseText(payload.srs_state),
  };

  const { error } = await supabase
    .from('learned_words')
    .upsert(record, { onConflict: 'user_unique_key,word_id' });

  if (error) {
    throw error;
  }

  await recalcProgressSummary(user_unique_key);
}

export async function resetLearned(wordId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const user_unique_key = await ensureUserKey();
  if (!user_unique_key) return;
  const { error } = await supabase
    .from('learned_words')
    .delete()
    .eq('user_unique_key', user_unique_key)
    .eq('word_id', wordId);

  if (error) {
    throw error;
  }

  await recalcProgressSummary(user_unique_key);
}
