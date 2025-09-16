import { ensureSessionForNickname, getActiveSession, getStoredPasscode } from '@/lib/auth';
import { getSupabaseClient } from './supabase';
import { canonNickname, isNicknameAllowed } from '@/core/nickname';

export async function ensureProfile(
  nickname: string
): Promise<{ user_id: string; nickname: string } | null> {
  if (!isNicknameAllowed(nickname)) throw new Error('Invalid nickname');
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const storedPasscode = getStoredPasscode() ?? undefined;
  const ensuredSession = await ensureSessionForNickname(nickname, storedPasscode);
  const activeSession = ensuredSession ?? (await getActiveSession());
  const user = activeSession?.user;
  if (!user) throw new Error('Authentication required to update profile.');
  const nickname_canon = canonNickname(nickname);
  const { data: dupe } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('nickname_canon', nickname_canon)
    .not('user_id', 'eq', user.id)
    .maybeSingle();
  if (dupe) throw { code: 'NICKNAME_TAKEN' };
  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, nickname, nickname_canon, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (upsertError) throw upsertError;
  return { user_id: user.id, nickname };
}
