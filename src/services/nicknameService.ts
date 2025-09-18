import { canonNickname } from '@/core/nickname';
import { ensureSessionForNickname, ensureSupabaseAuthSession, getStoredPasscode } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabaseClient';

export type NicknameRecord = {
  id: string;
  name: string;
  user_unique_key: string;
  passcode: number | null;
};

// Lowercase + remove spaces for the unique key
export function normalizeNickname(s: string) {
  return canonNickname(s);
}

// Optional: block risky nickname chars (doesn't affect key)
export function sanitizeNickname(s: string) {
  return s.replace(/[<>"'`$(){}\[\];]/g, '').trim();
}

export async function getNicknameByKey(key: string): Promise<NicknameRecord | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  await ensureSupabaseAuthSession();
  const { data, error } = await supabase
    .from('nicknames')
    .select('id, name, user_unique_key, passcode')
    .eq('user_unique_key', key)
    .maybeSingle();
  if (error) throw error;
  return (data as NicknameRecord | null) ?? null;
}

export async function upsertNickname(name: string): Promise<NicknameRecord> {
  const supabase = getSupabaseClient();
  const key = canonNickname(name);
  if (!supabase) {
    return { id: key, name, user_unique_key: key, passcode: null };
  }
  const storedPasscode = getStoredPasscode();
  let session = await ensureSupabaseAuthSession();

  if ((!session || session.user_unique_key !== key) && storedPasscode) {
    try {
      session = await ensureSessionForNickname(name, storedPasscode);
    } catch {
      session = null;
    }
  }

  const sessionKey = session?.user_unique_key ?? null;
  const expectedKey = key;

  if (!sessionKey || sessionKey !== expectedKey) {
    throw new Error('Authentication required to save nickname.');
  }

  const { data: existing, error: existingError } = await supabase
    .from('nicknames')
    .select('id, name, user_unique_key, passcode')
    .eq('user_unique_key', expectedKey)
    .maybeSingle<NicknameRecord>();

  if (existingError && existingError.code !== 'PGRST116') {
    throw existingError;
  }

  const storedPasscodeNumeric = storedPasscode && /^\d+$/.test(storedPasscode)
    ? Number(storedPasscode)
    : null;

  if (
    existing &&
    existing.passcode !== null &&
    storedPasscodeNumeric !== null &&
    existing.passcode !== storedPasscodeNumeric
  ) {
    throw { code: 'NICKNAME_TAKEN' };
  }

  if (existing && existing.name === name) {
    return existing;
  }

  const { data, error } = await supabase
    .from('nicknames')
    .upsert(
      { name, user_unique_key: expectedKey },
      { onConflict: 'user_unique_key' }
    )
    .select('id, name, user_unique_key, passcode')
    .single();
  if (error) throw error;
  return data as NicknameRecord;
}
