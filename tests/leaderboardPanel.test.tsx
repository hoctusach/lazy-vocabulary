/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  signedOut: false,
  friends: [] as Array<{ key: string; nick: string; learned: number }>,
  rpcCalls: [] as Array<[string, unknown]>,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/nickname', () => ({ getNicknameLocal: vi.fn(() => 'Me') }));
vi.mock('@/lib/auth', () => ({ ensureSupabaseAuthSession: vi.fn(async () => (mocks.signedOut ? null : { user_unique_key: 'me' })) }));
vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: vi.fn(() => ({
    rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
      mocks.rpcCalls.push([name, args]);
      const canon = (s: string) => s.toLowerCase().replace(/\s+/g, '');
      if (name === 'list_friends') return { data: mocks.friends.map((f) => ({ friend_key: f.key, nickname: f.nick, created_at: null })), error: null };
      if (name === 'add_friend_by_nickname') {
        const k = canon(String(args.p_nickname));
        if (k === 'me') return { data: null, error: { code: 'P0001', message: 'cannot add yourself' } };
        if (k !== 'bob') return { data: null, error: { code: 'P0002', message: 'nickname not found' } };
        if (!mocks.friends.length) mocks.friends.push({ key: 'bob', nick: 'Bob', learned: 7 });
        return { data: [{ friend_key: 'bob', nickname: 'Bob', created_at: null }], error: null };
      }
      if (name === 'remove_friend') {
        mocks.friends = [];
        return { data: [{ removed: true, friend_key: 'bob' }], error: null };
      }
      if (name === 'get_friends_leaderboard') {
        const rows = [{ key: 'me', nick: 'Me', learned: 3 }, ...mocks.friends].sort((a, b) => b.learned - a.learned);
        return {
          data: rows.map((r, i) => ({ user_key: r.key, nickname: r.nick, rank: i + 1, learned_words: r.learned, learning_words: 0, due_words: 0, is_current_user: r.key === 'me' })),
          error: null,
        };
      }
      return { data: [], error: null };
    }),
  })),
}));

import LeaderboardPanel from '@/components/vocabulary-app/LeaderboardPanel';

describe('LeaderboardPanel (friends)', () => {
  afterEach(cleanup);
  beforeEach(() => {
    mocks.signedOut = false;
    mocks.friends = [];
    mocks.rpcCalls = [];
  });

  it('empty state shows only me with add + share controls', async () => {
    render(<LeaderboardPanel />);
    await screen.findByText(/No friends yet/);
    expect(screen.getAllByTestId('leaderboard-row')).toHaveLength(1);
    expect(screen.getByLabelText("Friend's nickname")).toBeTruthy();
    expect(screen.getByText('Share my nickname')).toBeTruthy();
  });

  it('signed out: prompts sign in, lists nobody, no add form', async () => {
    mocks.signedOut = true;
    render(<LeaderboardPanel />);
    await screen.findByText(/Sign in to add friends/);
    expect(screen.queryAllByTestId('leaderboard-row')).toHaveLength(0);
    expect(screen.queryByLabelText("Friend's nickname")).toBeNull();
    expect(mocks.rpcCalls).toEqual([]);
  });

  it('adds a friend (case/space-insensitive), shows errors, and removes with confirm', async () => {
    render(<LeaderboardPanel />);
    await screen.findByText(/No friends yet/);
    const input = screen.getByLabelText("Friend's nickname");

    fireEvent.change(input, { target: { value: 'nobody' } });
    fireEvent.click(screen.getByRole('button', { name: /^Add$/ }));
    await screen.findByText('No learner with that nickname was found.');

    fireEvent.change(input, { target: { value: ' ME ' } });
    fireEvent.click(screen.getByRole('button', { name: /^Add$/ }));
    await screen.findByText(/That's you/);

    fireEvent.change(input, { target: { value: ' B O b ' } });
    fireEvent.click(screen.getByRole('button', { name: /^Add$/ }));
    await waitFor(() => expect(screen.getAllByTestId('leaderboard-row')).toHaveLength(2));
    const rows = screen.getAllByTestId('leaderboard-row');
    expect(rows[0].textContent).toContain('Bob');

    fireEvent.click(screen.getByLabelText('Remove Bob'));
    await screen.findByText('Remove friend?');
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.getAllByTestId('leaderboard-row')).toHaveLength(1));
  });

  it('period buttons request today / week / allTime', async () => {
    render(<LeaderboardPanel />);
    await screen.findByText(/No friends yet/);
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    await waitFor(() => expect(mocks.rpcCalls).toContainEqual(['get_friends_leaderboard', { p_period: 'today' }]));
    fireEvent.click(screen.getByRole('button', { name: 'This week' }));
    await waitFor(() => expect(mocks.rpcCalls).toContainEqual(['get_friends_leaderboard', { p_period: 'week' }]));
    fireEvent.click(screen.getByRole('button', { name: 'All time' }));
    await waitFor(() => expect(mocks.rpcCalls.filter(([n, a]) => n === 'get_friends_leaderboard' && (a as { p_period: string }).p_period === 'allTime').length).toBeGreaterThan(1));
  });
});
