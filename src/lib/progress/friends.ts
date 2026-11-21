import { ensureSupabaseAuthSession } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabaseClient';

export type Friend = {
  friendKey: string;
  nickname: string;
  createdAt: string | null;
};

export type FriendsErrorKind =
  | 'signed_out'
  | 'not_found'
  | 'cannot_add_self'
  | 'friend_limit'
  | 'rate_limited'
  | 'invalid'
  | 'unavailable';

export class FriendsError extends Error {
  kind: FriendsErrorKind;
  constructor(kind: FriendsErrorKind) {
    super(friendsErrorMessage(kind));
    this.name = 'FriendsError';
    this.kind = kind;
  }
}

export function friendsErrorMessage(kind: FriendsErrorKind): string {
  switch (kind) {
    case 'signed_out':
      return 'Sign in to add friends and see your friends board.';
    case 'not_found':
      return 'No learner with that nickname was found.';
    case 'cannot_add_self':
      return "That's you! Add a friend's nickname instead.";
    case 'friend_limit':
      return 'You have reached the limit of 50 friends.';
    case 'rate_limited':
      return 'Too many adds. Please try again in a few minutes.';
    case 'invalid':
      return 'Please enter a valid nickname.';
    case 'unavailable':
    default:
      return 'Friends are unavailable right now. Please try again.';
  }
}

type PgError = { code?: unknown; message?: unknown } | null | undefined;

/** Map a PostgREST error (code / message) to a FriendsError. */
export function mapFriendsError(error: PgError): FriendsError {
  const code = typeof error?.code === 'string' ? error.code : '';
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  switch (code) {
    case '28000':
      return new FriendsError('signed_out');
    case 'P0002':
      return new FriendsError('not_found');
    case 'P0003':
      return new FriendsError('rate_limited');
    case '22023':
      return new FriendsError('invalid');
    case 'P0001':
      return new FriendsError(/limit/.test(message) ? 'friend_limit' : 'cannot_add_self');
    default:
      return new FriendsError('unavailable');
  }
}

export type LeaderboardPeriod = 'today' | 'week' | 'allTime';

/**
 * Runs a session-gated RPC. Renews an expired edge session first; if there is
 * still no session, throws signed_out without calling the backend.
 */
export async function callFriendsRpc(fn: string, args?: Record<string, unknown>): Promise<unknown> {
  let session: Awaited<ReturnType<typeof ensureSupabaseAuthSession>> = null;
  try {
    session = await ensureSupabaseAuthSession();
  } catch (error) {
    console.warn('friends:ensureSession', error);
  }
  if (!session) throw new FriendsError('signed_out');

  let result: { data: unknown; error: PgError };
  try {
    result = await getSupabaseClient().rpc(fn, args);
  } catch (error) {
    console.warn(`friends:${fn}`, error);
    throw new FriendsError('unavailable');
  }
  if (result.error) {
    console.warn(`friends:${fn}`, result.error.message);
    throw mapFriendsError(result.error);
  }
  return result.data;
}

function firstRow(data: unknown): Record<string, unknown> | null {
  const row = Array.isArray(data) ? data[0] : data;
  return row && typeof row === 'object' ? (row as Record<string, unknown>) : null;
}

function toFriend(row: Record<string, unknown>): Friend | null {
  const friendKey = typeof row.friend_key === 'string' ? row.friend_key.trim() : '';
  if (!friendKey) return null;
  const nickname = typeof row.nickname === 'string' && row.nickname.trim() ? row.nickname.trim() : friendKey;
  return { friendKey, nickname, createdAt: typeof row.created_at === 'string' ? row.created_at : null };
}

export async function addFriendByNickname(nickname: string): Promise<Friend> {
  const trimmed = nickname.trim();
  if (!trimmed) throw new FriendsError('invalid');
  const data = await callFriendsRpc('add_friend_by_nickname', { p_nickname: trimmed });
  const row = firstRow(data);
  const friend = row ? toFriend(row) : null;
  if (!friend) throw new FriendsError('unavailable');
  return friend;
}

export async function removeFriend(nickname: string): Promise<boolean> {
  const trimmed = nickname.trim();
  if (!trimmed) throw new FriendsError('invalid');
  const data = await callFriendsRpc('remove_friend', { p_nickname: trimmed });
  return firstRow(data)?.removed === true;
}

export async function listFriends(): Promise<Friend[]> {
  const data = await callFriendsRpc('list_friends');
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => (row && typeof row === 'object' ? toFriend(row as Record<string, unknown>) : null))
    .filter((f): f is Friend => f !== null);
}
