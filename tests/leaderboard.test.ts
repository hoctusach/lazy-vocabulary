import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: { user_unique_key: 'me' } as null | Record<string, unknown>,
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  ensureSupabaseAuthSession: vi.fn(async () => mocks.session),
  getStoredPasscode: vi.fn(() => null),
  hasStoredSignIn: vi.fn(() => false),
  forceRefreshSession: vi.fn(async () => null),
  isCredentialRejection: vi.fn(() => false),
}));
vi.mock('@/lib/supabaseClient', () => ({ getSupabaseClient: vi.fn(() => ({ rpc: mocks.rpc, from: mocks.from })) }));

import { getLeaderboardState } from '@/lib/progress/leaderboard';

const row = (user_key: string, rank: number, learned: number, me = false) => ({
  user_key, nickname: user_key.toUpperCase(), rank, learned_words: learned, learning_words: 1, due_words: 0, is_current_user: me,
});

describe('[FB-25] friends leaderboard state', () => {
  beforeEach(() => {
    mocks.session = { user_unique_key: 'me' };
    mocks.rpc.mockReset();
    mocks.from.mockReset();
  });

  it('calls get_friends_leaderboard (never selects learned_words) and maps ranked rows', async () => {
    mocks.rpc.mockResolvedValue({ data: [row('amy', 1, 9), row('me', 2, 4, true)], error: null });
    const state = await getLeaderboardState();
    expect(mocks.rpc).toHaveBeenCalledWith('get_friends_leaderboard', { p_period: 'allTime' });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(state.entries.map((e) => [e.rank, e.userKey, e.learnedWords])).toEqual([[1, 'amy', 9], [2, 'me', 4]]);
    expect(state.currentUserEntry).toMatchObject({ userKey: 'me', isCurrentUser: true, nickname: 'ME' });
  });

  it.each(['today', 'week', 'allTime'] as const)('passes period %s through', async (period) => {
    mocks.rpc.mockResolvedValue({ data: [row('me', 1, 0, true)], error: null });
    const state = await getLeaderboardState({ period });
    expect(mocks.rpc).toHaveBeenCalledWith('get_friends_leaderboard', { p_period: period });
    expect(state.timeframe).toBe(period);
  });

  it('empty friends: only me', async () => {
    mocks.rpc.mockResolvedValue({ data: [row('me', 1, 3, true)], error: null });
    const state = await getLeaderboardState();
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0].isCurrentUser).toBe(true);
  });

  it('signed out: no backend call, no entries', async () => {
    mocks.session = null;
    const state = await getLeaderboardState();
    expect(state).toMatchObject({ signedOut: true, entries: [] });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('[FB-02] rejected server session (28000, no passcode) reads as session expired', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '28000', message: 'invalid session' } });
    expect(await getLeaderboardState()).toMatchObject({ sessionExpired: true, entries: [] });
  });

  it('backend failure gives an error message, not a crash', async () => {
    mocks.rpc.mockRejectedValue(new TypeError('Failed to fetch'));
    const state = await getLeaderboardState();
    expect(state.entries).toEqual([]);
    expect(state.error).toMatch(/unavailable/i);
  });
});
