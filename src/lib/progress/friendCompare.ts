import { getSupabaseClient } from '@/lib/supabaseClient';
import { getNicknameLocal } from '@/lib/nickname';
import { getStoredPasscode } from '@/lib/auth';

export type FriendProgress = {
  nickname: string;
  learnedCount: number;
  streakDays: number;
};

type RpcRow = {
  nickname?: unknown;
  learned_count?: unknown;
  streak_days?: unknown;
};

function toPositiveInteger(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

/**
 * Looks up a friend's public progress (nickname, learned count, streak) by
 * their share-link token. Goes through get_public_progress_by_token, a
 * narrow SECURITY DEFINER RPC keyed by a random per-user token — never by
 * user_unique_key, which is derived deterministically from the nickname and
 * so would be guessable. See supabase/sql/2026-08-friend-compare.sql.
 */
export async function getFriendProgress(shareToken: string): Promise<FriendProgress | null> {
  const trimmedToken = shareToken?.trim();
  if (!trimmedToken) return null;

  try {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('get_public_progress_by_token', {
      p_share_token: trimmedToken,
    });

    if (error) {
      console.warn('friendCompare:getFriendProgress', error.message);
      return null;
    }

    const row = (Array.isArray(data) ? data[0] : data) as RpcRow | null | undefined;
    if (!row || typeof row.nickname !== 'string' || !row.nickname.trim()) return null;

    return {
      nickname: row.nickname.trim(),
      learnedCount: toPositiveInteger(row.learned_count),
      streakDays: toPositiveInteger(row.streak_days),
    };
  } catch (error) {
    console.warn('friendCompare:getFriendProgress', error);
    return null;
  }
}

/**
 * Fetches (creating on first use) the signed-in user's own share token by
 * re-proving their nickname + passcode — the same credential check sign-in
 * itself uses. Returns null if no one is signed in locally or the RPC fails.
 */
export async function getOwnShareToken(): Promise<string | null> {
  const nickname = getNicknameLocal()?.trim();
  const passcode = getStoredPasscode()?.trim();
  if (!nickname || !passcode) return null;

  const passcodeNumeric = Number(passcode);
  if (!Number.isFinite(passcodeNumeric)) return null;

  try {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('get_or_create_share_token', {
      p_nickname: nickname,
      p_passcode: passcodeNumeric,
    });

    if (error) {
      console.warn('friendCompare:getOwnShareToken', error.message);
      return null;
    }

    const token = typeof data === 'string' ? data.trim() : '';
    return token || null;
  } catch (error) {
    console.warn('friendCompare:getOwnShareToken', error);
    return null;
  }
}

const FRIEND_QUERY_PARAM = 'friend';

export function buildFriendShareUrl(shareToken: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set(FRIEND_QUERY_PARAM, shareToken);
  return url.toString();
}

export function readFriendKeyFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const key = params.get(FRIEND_QUERY_PARAM)?.trim();
  return key || null;
}
