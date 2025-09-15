import { supabase } from './supabase';
import type { LearnedWord } from '@/core/models';

async function getUserId(): Promise<string> {
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
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('learned_words')
    .select('*')
    .eq('user_id', user_id);
  if (error) throw error;
  return data || [];
}

export async function upsertLearned(wordId: string, inReview: boolean): Promise<void> {
  const user_id = await getUserId();
  const { error } = await supabase
    .from('learned_words')
    .upsert(
      { user_id, word_id: wordId, in_review_queue: inReview, learned_at: new Date().toISOString() },
      { onConflict: 'user_id,word_id' }
    );
  if (error) throw error;
}

export async function setReview(wordId: string, inReview: boolean): Promise<void> {
  const user_id = await getUserId();
  const { error } = await supabase
    .from('learned_words')
    .update({ in_review_queue: inReview, learned_at: new Date().toISOString() })
    .eq('user_id', user_id)
    .eq('word_id', wordId);
  if (error) throw error;
}
