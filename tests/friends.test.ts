import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: { user_unique_key: 'me' } as null | Record<string, unknown>,
  rpc: vi.fn(),
  passcode: '1234' as string | null,
  signedInLocally: true,
  refresh: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  ensureSupabaseAuthSession: vi.fn(async () => mocks.session),
  getStoredPasscode: vi.fn(() => mocks.passcode),
  hasStoredSignIn: vi.fn(() => mocks.signedInLocally),
  forceRefreshSession: (...a: unknown[]) => mocks.refresh(...a),
  isCredentialRejection: (e: { code?: string; status?: number } | null) =>
    e?.code === 'INCORRECT_PASSCODE' || e?.status === 401,
}));
vi.mock('@/lib/supabaseClient', () => ({ getSupabaseClient: vi.fn(() => ({ rpc: mocks.rpc })) }));

import {
  addFriendByNickname,
  FriendsError,
  listFriends,
  mapFriendsError,
  removeFriend,
} from '@/lib/progress/friends';

const fail = (code: string, message = '') => ({ data: null, error: { code, message } });

describe('friends helpers', () => {
  beforeEach(() => {
    mocks.session = { user_unique_key: 'me' };
    mocks.rpc.mockReset();
    mocks.passcode = '1234';
    mocks.signedInLocally = true;
    mocks.refresh.mockReset();
    mocks.refresh.mockResolvedValue({ user_unique_key: 'me' });
  });

  it('adds by trimmed nickname and maps the row', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ friend_key: 'bob', nickname: 'Bob', created_at: '2026-01-01T00:00:00Z' }], error: null });
    const friend = await addFriendByNickname('  Bob ');
    expect(mocks.rpc).toHaveBeenCalledWith('add_friend_by_nickname', { p_nickname: 'Bob' });
    expect(friend).toEqual({ friendKey: 'bob', nickname: 'Bob', createdAt: '2026-01-01T00:00:00Z' });
  });

  it('rejects an empty nickname without calling the backend', async () => {
    await expect(addFriendByNickname('   ')).rejects.toMatchObject({ kind: 'invalid' });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('removes (idempotent: removed=false is fine)', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [{ removed: true, friend_key: 'bob' }], error: null });
    expect(await removeFriend('Bob')).toBe(true);
    mocks.rpc.mockResolvedValueOnce({ data: [{ removed: false, friend_key: 'bob' }], error: null });
    expect(await removeFriend('Bob')).toBe(false);
    expect(mocks.rpc).toHaveBeenCalledWith('remove_friend', { p_nickname: 'Bob' });
  });

  it('lists friends', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ friend_key: 'a', nickname: 'A', created_at: null }, { nickname: 'bad' }], error: null });
    expect(await listFriends()).toEqual([{ friendKey: 'a', nickname: 'A', createdAt: null }]);
    expect(mocks.rpc).toHaveBeenCalledWith('list_friends', undefined);
  });

  it('empty list when no friends', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    expect(await listFriends()).toEqual([]);
  });

  it('does not call the backend and reports signed_out with no session', async () => {
    mocks.session = null;
    mocks.signedInLocally = false;
    await expect(listFriends()).rejects.toMatchObject({ kind: 'signed_out' });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['P0002', 'nickname not found', 'not_found'],
    ['P0001', 'cannot add yourself', 'cannot_add_self'],
    ['P0001', 'friend limit reached', 'friend_limit'],
    ['P0003', 'too many friend requests, try later', 'rate_limited'],
    ['22023', 'invalid', 'invalid'],
    ['XX000', 'boom', 'unavailable'],
  ])('maps %s (%s) to %s', async (code, message, kind) => {
    expect(mapFriendsError({ code, message }).kind).toBe(kind);
    mocks.rpc.mockResolvedValue(fail(code, message));
    const err = await addFriendByNickname('x').catch((e) => e);
    expect(err).toBeInstanceOf(FriendsError);
    expect(err.kind).toBe(kind);
  });

  it('maps 28000 to signed_out at the mapper level', () => {
    expect(mapFriendsError({ code: '28000' }).kind).toBe('signed_out');
  });

  it('treats a thrown network error as unavailable', async () => {
    mocks.rpc.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(listFriends()).rejects.toMatchObject({ kind: 'unavailable' });
  });

  describe('rejected session token (28000)', () => {
    it('refreshes with the stored passcode and retries exactly once', async () => {
      mocks.rpc
        .mockResolvedValueOnce(fail('28000', 'invalid or expired session'))
        .mockResolvedValueOnce({ data: [{ friend_key: 'a', nickname: 'A', created_at: null }], error: null });
      expect(await listFriends()).toEqual([{ friendKey: 'a', nickname: 'A', createdAt: null }]);
      expect(mocks.refresh).toHaveBeenCalledTimes(1);
      expect(mocks.rpc).toHaveBeenCalledTimes(2);
    });

    it('28000 twice -> session_expired, no third call', async () => {
      mocks.rpc.mockResolvedValue(fail('28000'));
      await expect(listFriends()).rejects.toMatchObject({ kind: 'session_expired' });
      expect(mocks.refresh).toHaveBeenCalledTimes(1);
      expect(mocks.rpc).toHaveBeenCalledTimes(2);
    });

    it('no stored passcode -> session_expired without a refresh', async () => {
      mocks.passcode = null;
      mocks.rpc.mockResolvedValue(fail('28000'));
      await expect(listFriends()).rejects.toMatchObject({ kind: 'session_expired' });
      expect(mocks.refresh).not.toHaveBeenCalled();
      expect(mocks.rpc).toHaveBeenCalledTimes(1);
    });

    it('credential rejection during refresh -> session_expired', async () => {
      mocks.rpc.mockResolvedValue(fail('28000'));
      mocks.refresh.mockRejectedValue(Object.assign(new Error('bad'), { code: 'INCORRECT_PASSCODE' }));
      await expect(listFriends()).rejects.toMatchObject({ kind: 'session_expired' });
      expect(mocks.rpc).toHaveBeenCalledTimes(1);
    });

    it('network error during refresh -> unavailable (not signed out)', async () => {
      mocks.rpc.mockResolvedValue(fail('28000'));
      mocks.refresh.mockRejectedValue(new TypeError('Failed to fetch'));
      await expect(listFriends()).rejects.toMatchObject({ kind: 'unavailable' });
      expect(mocks.rpc).toHaveBeenCalledTimes(1);
    });

    it('no session but locally signed in -> session_expired; not signed in -> signed_out', async () => {
      mocks.session = null;
      await expect(listFriends()).rejects.toMatchObject({ kind: 'session_expired' });
      mocks.signedInLocally = false;
      await expect(listFriends()).rejects.toMatchObject({ kind: 'signed_out' });
    });
  });
});
