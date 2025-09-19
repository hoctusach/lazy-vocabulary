import {
  ensureSessionForNickname,
  ensureSupabaseAuthSession,
  getStoredPasscode,
} from '@/lib/auth';
import { CUSTOM_AUTH_MODE } from '@/lib/customAuthMode';
import { getSupabaseClient } from './supabase';
import { canonNickname, isNicknameAllowed } from '@/core/nickname';

type NicknameProfile = {
  id: string;
  name: string;
  user_unique_key: string;
  passcode: number | null;
};

export async function ensureProfile(nickname: string): Promise<NicknameProfile | null> {
  if (!isNicknameAllowed(nickname)) throw new Error('Invalid nickname');
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  if (CUSTOM_AUTH_MODE) return null;
  const storedPasscode = getStoredPasscode() ?? undefined;
  let ensuredSession = await ensureSupabaseAuthSession();
  const normalizedTarget = canonNickname(nickname);
  if (storedPasscode && (!ensuredSession || canonNickname(ensuredSession.nickname) !== normalizedTarget)) {
    ensuredSession = await ensureSessionForNickname(nickname, storedPasscode);
  }
  const user = ensuredSession?.user;
  if (!user) throw new Error('Authentication required to update profile.');
  const nicknameKey = normalizedTarget;

  const { data: taken, error: takenError } = await supabase
    .from('nicknames')
    .select('user_unique_key')
    .eq('user_unique_key', nicknameKey)
    .maybeSingle<{ user_unique_key: string | null }>();

  if (takenError && takenError.code !== 'PGRST116') {
    throw takenError;
  }

  if (taken && taken.user_unique_key && taken.user_unique_key !== user.id) {
    throw { code: 'NICKNAME_TAKEN' };
  }

  const { data, error: upsertError } = await supabase
    .from('nicknames')
    .upsert({ user_unique_key: nicknameKey, name: nickname }, { onConflict: 'user_unique_key' })
    .select('id, name, user_unique_key, passcode')
    .maybeSingle<{ id: string | number; name: string; user_unique_key: string; passcode: number | null }>();

  if (upsertError) {
    if (upsertError.code === '23505') {
      throw { code: 'NICKNAME_TAKEN' };
    }
    throw upsertError;
  }

  if (!data) return null;

  return {
    id: typeof data.id === 'string' ? data.id : String(data.id),
    name: data.name,
    user_unique_key: data.user_unique_key,
    passcode: data.passcode ?? null,
  };
}
