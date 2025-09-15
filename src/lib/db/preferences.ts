import { supabase } from './supabase';
import type { UserPreferences } from '@/core/models';

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

const DEFAULT_PREFS: UserPreferences = {
  favorite_voice: null,
  speech_rate: null,
  is_muted: false,
  is_playing: false,
  daily_option: null,
};

export async function getPreferences(): Promise<UserPreferences> {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user_id)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const { error: upsertError } = await supabase
      .from('user_preferences')
      .upsert({ user_id, ...DEFAULT_PREFS });
    if (upsertError) throw upsertError;
    return DEFAULT_PREFS;
  }
  return {
    favorite_voice: data.favorite_voice,
    speech_rate: data.speech_rate,
    is_muted: data.is_muted,
    is_playing: data.is_playing,
    daily_option: data.daily_option,
  };
}

export async function savePreferences(p: Partial<UserPreferences>): Promise<void> {
  const user_id = await getUserId();
  const { data: existing } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user_id)
    .maybeSingle();
  const merged = { ...DEFAULT_PREFS, ...existing, ...p };
  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_id, ...merged, updated_at: new Date().toISOString() });
  if (error) throw error;
}
