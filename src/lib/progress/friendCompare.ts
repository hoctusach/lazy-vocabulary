import { getSupabaseClient } from '@/lib/supabaseClient';

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
 * their share-link key. Goes through get_public_progress_by_key, a narrow
 * SECURITY DEFINER RPC, rather than a plain table read — see
 * supabase/sql/2026-08-friend-compare.sql for why.
 */
export async function getFriendProgress(userKey: string): Promise<FriendProgress | null> {
  const trimmedKey = userKey?.trim();
  if (!trimmedKey) return null;

  try {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('get_public_progress_by_key', {
      target_user_unique_key: trimmedKey,
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

const FRIEND_QUERY_PARAM = 'friend';

export function buildFriendShareUrl(userKey: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set(FRIEND_QUERY_PARAM, userKey);
  return url.toString();
}

export function readFriendKeyFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const key = params.get(FRIEND_QUERY_PARAM)?.trim();
  return key || null;
}
