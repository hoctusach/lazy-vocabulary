import { getSupabaseClient } from './supabase';
import type { UserPreferences } from '@/core/models';
import { ensureUserKey } from '@/lib/progress/srsSyncByUserKey';

const DEFAULT_PREFS: UserPreferences = {
  favorite_voice: null,
  speech_rate: null,
  is_muted: false,
  is_playing: false,
  daily_option: null,
};

export async function getPreferences(): Promise<UserPreferences> {
  const supabase = getSupabaseClient();
  if (!supabase) return DEFAULT_PREFS;
  const user_unique_key = await ensureUserKey();
  if (!user_unique_key) return DEFAULT_PREFS;
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_unique_key', user_unique_key)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const { error: upsertError } = await supabase
      .from('user_preferences')
      .upsert({ user_unique_key, ...DEFAULT_PREFS });
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
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const user_unique_key = await ensureUserKey();
  if (!user_unique_key) return;
  const { data: existing } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_unique_key', user_unique_key)
    .maybeSingle();
  const merged = { ...DEFAULT_PREFS, ...existing, ...p };
  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_unique_key, ...merged, updated_at: new Date().toISOString() });
  if (error) throw error;
}
