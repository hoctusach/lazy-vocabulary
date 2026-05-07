import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  orderCalls: [] as Array<{ column: string; options: { ascending: boolean } }>,
  activeSession: null as null | Record<string, unknown>,
  progressSummary: null as null | Record<string, unknown>,
}));

vi.mock('@/lib/auth', () => ({
  getActiveSession: vi.fn(async () => mocks.activeSession),
}));

vi.mock('@/lib/nickname', () => ({
  getNicknameLocal: vi.fn(() => 'Local You'),
}));

vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(function (this: unknown) {
        return this;
      }),
      order: vi.fn(function (this: unknown, column: string, options: { ascending: boolean }) {
        mocks.orderCalls.push({ column, options });
        return this;
      }),
      limit: vi.fn(async () => ({ data: mocks.rows, error: null })),
    })),
  })),
}));

vi.mock('@/lib/progress/progressSummary', () => ({
  getProgressSummary: vi.fn(async () => mocks.progressSummary),
}));

import { getLeaderboardState } from '@/lib/progress/leaderboard';

describe('leaderboard state', () => {
  beforeEach(() => {
    mocks.rows = [];
    mocks.orderCalls = [];
    mocks.activeSession = null;
    mocks.progressSummary = null;
  });

  it('ranks the top five by learned words and then learning count', async () => {
    mocks.rows = [
      row('beta', 8, 1),
      row('alpha', 10, 2),
      row('charlie', 10, 7),
      row('delta', 9, 9),
      row('echo', 7, 20),
    ];

    const state = await getLeaderboardState();

    expect(mocks.orderCalls).toEqual([
      { column: 'learned_count', options: { ascending: false } },
      { column: 'learning_count', options: { ascending: false } },
    ]);
    expect(state.entries.map((entry) => [entry.rank, entry.userKey, entry.learnedWords, entry.learningWords])).toEqual([
      [1, 'charlie', 10, 7],
      [2, 'alpha', 10, 2],
      [3, 'delta', 9, 9],
      [4, 'beta', 8, 1],
      [5, 'echo', 7, 20],
    ]);
  });

  it('keeps an outside current user separate with current local counts', async () => {
    mocks.activeSession = { user_unique_key: 'you', name: 'You' };
    mocks.progressSummary = { learned_count: 1, learning_count: 1, learning_due_count: 0, learned_days: [] };
    mocks.rows = [
      row('first', 10, 1),
      row('second', 9, 1),
      row('third', 8, 1),
      row('fourth', 7, 1),
      row('fifth', 6, 1),
    ];

    const state = await getLeaderboardState({
      currentUserLearnedCount: 3,
      currentUserLearningCount: 4,
      currentUserDueCount: 2,
    });

    expect(state.entries).toHaveLength(5);
    expect(state.entries.some((entry) => entry.userKey === 'you')).toBe(false);
    expect(state.currentUserEntry).toMatchObject({
      userKey: 'you',
      rank: 6,
      learnedWords: 3,
      learningWords: 4,
      dueWords: 2,
      isCurrentUser: true,
    });
  });

  it('moves the current user into the top five when current counts qualify', async () => {
    mocks.activeSession = { user_unique_key: 'you', name: 'You' };
    mocks.rows = [
      row('first', 10, 1),
      row('second', 9, 1),
      row('third', 8, 1),
      row('fourth', 7, 1),
      row('fifth', 6, 1),
    ];

    const state = await getLeaderboardState({
      currentUserLearnedCount: 11,
      currentUserLearningCount: 4,
      currentUserDueCount: 2,
    });

    expect(state.entries).toHaveLength(5);
    expect(state.entries[0]).toMatchObject({ userKey: 'you', rank: 1, learnedWords: 11, learningWords: 4 });
    expect(state.entries.filter((entry) => entry.userKey === 'you')).toHaveLength(1);
    expect(state.currentUserEntry?.rank).toBe(1);
  });
});

function row(userKey: string, learnedCount: number, learningCount: number, dueCount = 0) {
  return {
    user_unique_key: userKey,
    learned_count: learnedCount,
    learning_count: learningCount,
    learning_due_count: dueCount,
    learning_time: 0,
    learned_days: [],
  };
}
