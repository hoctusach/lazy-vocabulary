import { ensureSessionForNickname, getActiveSession, getStoredPasscode } from '@/lib/auth';
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
  const storedPasscode = getStoredPasscode() ?? undefined;
  const ensuredSession = await ensureSessionForNickname(nickname, storedPasscode);
  const activeSession = ensuredSession ?? (await getActiveSession());
  const user = activeSession?.user;
  if (!user) throw new Error('Authentication required to update profile.');
  const nicknameKey = canonNickname(nickname);

  const { data: taken, error: takenError } = await supabase
    .from('nicknames')
    .select('user_id')
    .eq('user_unique_key', nicknameKey)
    .maybeSingle<{ user_id: string | null }>();

  if (takenError && takenError.code !== 'PGRST116') {
    throw takenError;
  }

  if (taken && taken.user_id && taken.user_id !== user.id) {
    throw { code: 'NICKNAME_TAKEN' };
  }

  const { data, error: upsertError } = await supabase
    .from('nicknames')
    .upsert({ user_id: user.id, name: nickname }, { onConflict: 'user_id' })
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
