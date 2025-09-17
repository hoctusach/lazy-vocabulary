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
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('nicknames')
    .select('id, display_name, name_canonical')
    .eq('name_canonical', key)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function upsertNickname(display: string) {
  const supabase = getSupabaseClient();
  const key = normalizeNickname(display);
  if (!supabase) {
    return { id: key, display_name: display, name_canonical: key };
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
      { display_name: display, name_canonical: key, user_id: user.id },
      { onConflict: 'name_canonical' }
    )
    .select('id, display_name, name_canonical')
    .single();
  if (error) throw error;
  return data!;
}
