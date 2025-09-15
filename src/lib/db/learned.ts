import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';
import type { LearnedWord } from '@/core/models';

async function getUserId(supabase: SupabaseClient): Promise<string> {
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error) throw error;
  let user = sessionData.session?.user;
  if (!user) {
    const { data, error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError || !data.user) throw anonError || new Error('anonymous sign-in failed');
    user = data.user;
  }
  return user.id;
}

export async function getLearned(): Promise<LearnedWord[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const user_id = await getUserId(supabase);
  const { data, error } = await supabase
    .from('learned_words')
    .select('*')
    .eq('user_id', user_id);
  if (error) throw error;
  return data || [];
}

export async function upsertLearned(wordId: string, inReview: boolean): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const user_id = await getUserId(supabase);
  const { error } = await supabase
    .from('learned_words')
    .upsert(
      { user_id, word_id: wordId, in_review_queue: inReview, learned_at: new Date().toISOString() },
      { onConflict: 'user_id,word_id' }
    );
  if (error) throw error;
}

export async function setReview(wordId: string, inReview: boolean): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const user_id = await getUserId(supabase);
  const { error } = await supabase
    .from('learned_words')
    .update({ in_review_queue: inReview, learned_at: new Date().toISOString() })
    .eq('user_id', user_id)
    .eq('word_id', wordId);
  if (error) throw error;
}
