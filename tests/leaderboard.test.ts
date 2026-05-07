import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  fromCalls: [] as string[],
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
    from: vi.fn((table: string) => {
      mocks.fromCalls.push(table);
      return {
        select: vi.fn(async () => ({ data: mocks.rows, error: null })),
      };
    }),
  })),
}));

vi.mock('@/lib/progress/progressSummary', () => ({
  getProgressSummary: vi.fn(async () => mocks.progressSummary),
}));

import { getLeaderboardState } from '@/lib/progress/leaderboard';

describe('leaderboard state', () => {
  beforeEach(() => {
    mocks.rows = [];
    mocks.fromCalls = [];
    mocks.activeSession = null;
    mocks.progressSummary = null;
  });

  it('ranks the top five from learned_words counts by learned words and then learning count', async () => {
    mocks.rows = [
      ...rows('beta', 8, 1),
      ...rows('alpha', 10, 2),
      ...rows('charlie', 10, 7),
      ...rows('delta', 9, 9),
      ...rows('echo', 7, 20),
      ...rows('foxtrot', 6, 50),
    ];

    const state = await getLeaderboardState();

    expect(mocks.fromCalls).toEqual(['learned_words']);
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
      ...rows('first', 10, 1),
      ...rows('second', 9, 1),
      ...rows('third', 8, 1),
      ...rows('fourth', 7, 1),
      ...rows('fifth', 6, 1),
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
      ...rows('first', 10, 1),
      ...rows('second', 9, 1),
      ...rows('third', 8, 1),
      ...rows('fourth', 7, 1),
      ...rows('fifth', 6, 1),
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

function rows(userKey: string, learnedCount: number, learningCount: number, dueCount = 0) {
  return [
    ...Array.from({ length: learnedCount }, (_, index) => ({
      user_unique_key: userKey,
      word_id: `${userKey}-learned-${index}`,
      srs_state: 'learned',
      next_review_at: null,
    })),
    ...Array.from({ length: learningCount }, (_, index) => ({
      user_unique_key: userKey,
      word_id: `${userKey}-learning-${index}`,
      srs_state: 'learning',
      next_review_at: index < dueCount ? '2020-01-01T00:00:00Z' : '2999-01-01T00:00:00Z',
    })),
  ];
}
