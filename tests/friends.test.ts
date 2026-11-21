import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: { user_unique_key: 'me' } as null | Record<string, unknown>,
  rpc: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ ensureSupabaseAuthSession: vi.fn(async () => mocks.session) }));
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
    await expect(listFriends()).rejects.toMatchObject({ kind: 'signed_out' });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['28000', '', 'signed_out'],
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

  it('treats a thrown network error as unavailable', async () => {
    mocks.rpc.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(listFriends()).rejects.toMatchObject({ kind: 'unavailable' });
  });
});
