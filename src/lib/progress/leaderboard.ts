import { callFriendsRpc, FriendsError, friendsErrorMessage, type LeaderboardPeriod } from './friends';

export type LeaderboardTimeframe = LeaderboardPeriod;

export type LeaderboardEntry = {
  userKey: string;
  nickname: string;
  rank: number;
  learnedWords: number;
  learningWords: number;
  dueWords: number;
  isCurrentUser?: boolean;
};

export type LeaderboardState = {
  timeframe: LeaderboardTimeframe;
  entries: LeaderboardEntry[];
  currentUserEntry?: LeaderboardEntry;
  isLoading: boolean;
  /** True when there is no live session; no board is shown. */
  signedOut?: boolean;
  error?: string;
};

type LeaderboardRpcRow = Record<string, unknown>;

function toCount(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function rowToEntry(row: LeaderboardRpcRow, index: number): LeaderboardEntry | null {
  const userKey = typeof row.user_key === 'string' ? row.user_key.trim() : '';
  if (!userKey) return null;
  const nickname = typeof row.nickname === 'string' && row.nickname.trim() ? row.nickname.trim() : userKey;
  const rank = toCount(row.rank);
  return {
    userKey,
    nickname,
    rank: rank > 0 ? rank : index + 1,
    learnedWords: toCount(row.learned_words),
    learningWords: toCount(row.learning_words),
    dueWords: toCount(row.due_words),
    isCurrentUser: row.is_current_user === true,
  };
}

/**
 * Friends-only board: the signed-in user plus the people they added, ranked
 * by the server. Never lists anyone else.
 */
export async function getLeaderboardState(
  options: { period?: LeaderboardTimeframe } = {}
): Promise<LeaderboardState> {
  const timeframe = options.period ?? 'allTime';
  try {
    const data = await callFriendsRpc('get_friends_leaderboard', { p_period: timeframe });
    const rows = Array.isArray(data) ? (data as LeaderboardRpcRow[]) : [];
    const entries = rows
      .map((row, index) => (row && typeof row === 'object' ? rowToEntry(row, index) : null))
      .filter((entry): entry is LeaderboardEntry => entry !== null)
      .sort((a, b) => a.rank - b.rank);
    return {
      timeframe,
      entries,
      currentUserEntry: entries.find((entry) => entry.isCurrentUser),
      isLoading: false,
    };
  } catch (error) {
    if (error instanceof FriendsError && error.kind === 'signed_out') {
      return { timeframe, entries: [], isLoading: false, signedOut: true };
    }
    const message = error instanceof FriendsError ? error.message : friendsErrorMessage('unavailable');
    return { timeframe, entries: [], isLoading: false, error: message };
  }
}
