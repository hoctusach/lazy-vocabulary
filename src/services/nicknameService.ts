import { getSupabaseClient } from '@/lib/supabaseClient';

// Lowercase + remove spaces for the unique key
export function normalizeNickname(s: string) {
  return s.toLowerCase().replace(/\s+/g, '');
}

// Optional: block risky display chars (doesn't affect key)
export function sanitizeDisplay(s: string) {
  return s.replace(/[<>"'`$(){}\[\];]/g, '').trim();
}

export async function getNicknameByKey(key: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('nicknames')
    .select('id, name')
    .eq('user_unique_key', key)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function upsertNickname(display: string) {
  const supabase = getSupabaseClient();
  const key = normalizeNickname(display);
  const { data, error } = await supabase
    .from('nicknames')
    .upsert(
      { name: display, user_unique_key: key },
      { onConflict: 'user_unique_key' }
    )
    .select('id, name')
    .single();
  if (error) throw error;
  return data!;
}
