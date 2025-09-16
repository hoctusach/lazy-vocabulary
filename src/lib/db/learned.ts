import { getSupabaseClient } from './supabase';
import type { LearnedWord } from '@/core/models';
import { ensureUserKey } from '@/lib/progress/srsSyncByUserKey';

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

export async function upsertLearned(wordId: string, inReview: boolean): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const user_unique_key = await ensureUserKey();
  if (!user_unique_key) return;
  const { error } = await supabase
    .from('learned_words')
    .upsert(
      {
        user_unique_key,
        word_id: wordId,
        in_review_queue: inReview,
        learned_at: new Date().toISOString(),
      },
      { onConflict: 'user_unique_key,word_id' }
    );
  if (error) throw error;
}

export async function setReview(wordId: string, inReview: boolean): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const user_unique_key = await ensureUserKey();
  if (!user_unique_key) return;
  const { error } = await supabase
    .from('learned_words')
    .update({ in_review_queue: inReview, learned_at: new Date().toISOString() })
    .eq('user_unique_key', user_unique_key)
    .eq('word_id', wordId);
  if (error) throw error;
}
