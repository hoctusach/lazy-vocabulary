import { getSupabaseClient } from '@/lib/supabaseClient';

export type NicknameRecord = {
  id: string;
  name: string;
  user_unique_key: string;
  passcode: number | null;
};

// Lowercase + remove spaces for the unique key
export function normalizeNickname(s: string) {
  return s.toLowerCase().replace(/\s+/g, '');
}

// Optional: block risky display chars (doesn't affect key)
export function sanitizeDisplay(s: string) {
  return s.replace(/[<>"'`$(){}\[\];]/g, '').trim();
}

export async function getNicknameByKey(key: string): Promise<NicknameRecord | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('nicknames')
    .select('id, name, user_unique_key, passcode')
    .eq('user_unique_key', key)
    .maybeSingle();
  if (error) throw error;
  return (data as NicknameRecord | null) ?? null;
}

export async function upsertNickname(display: string): Promise<NicknameRecord> {
  const supabase = getSupabaseClient();
  const key = normalizeNickname(display);
  if (!supabase) {
    return { id: key, name: display, user_unique_key: key, passcode: null };
  }
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user?.id) {
    throw new Error('Authentication required to save nickname.');
  }
  const { data, error } = await supabase
    .from('nicknames')
    .upsert(
      { name: display, user_unique_key: key, user_id: user.id },
      { onConflict: 'user_unique_key' }
    )
    .select('id, name, user_unique_key, passcode')
    .single();
  if (error) throw error;
  return data as NicknameRecord;
}
