import { getActiveSession } from '@/lib/auth';
import { getNicknameLocal } from '@/lib/nickname';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { getProgressSummary } from './progressSummary';

export type LeaderboardTimeframe = 'today' | 'week' | 'allTime';

export type LeaderboardEntry = {
  userKey: string;
  nickname: string;
  rank: number;
  learnedWords: number;
  learningWords: number;
  dueWords: number;
  streakDays?: number;
  learningMinutes?: number;
  isCurrentUser?: boolean;
};

export type LeaderboardState = {
  timeframe: LeaderboardTimeframe;
  entries: LeaderboardEntry[];
  currentUserEntry?: LeaderboardEntry;
  isLoading: boolean;
  error?: string;
};

type LeaderboardRow = {
  user_unique_key?: unknown;
  nickname?: unknown;
  name?: unknown;
  learned_count?: unknown;
  learning_count?: unknown;
  learning_due_count?: unknown;
  learning_time?: unknown;
  learned_days?: unknown;
  updated_at?: unknown;
};

type LeaderboardOptions = {
  limit?: number;
  currentUserLearnedCount?: number;
  currentUserLearningCount?: number;
  currentUserDueCount?: number;
};

const DEFAULT_LIMIT = 5;
const USER_KEY_STORAGE_KEY = 'lazyVoca.userKey';

function readLocalStorage(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toPositiveInteger(value: unknown, fallback = 0): number {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return fallback;
  return Math.max(0, Math.trunc(parsed));
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  value.forEach((entry) => {
    if (typeof entry !== 'string') return;
    const trimmed = entry.trim();
    if (trimmed.length === 10) {
      seen.add(trimmed);
    }
  });
  return Array.from(seen).sort();
}

function displayNameFromRow(row: LeaderboardRow, userKey: string): string {
  const candidates = [row.name, row.nickname, userKey];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (trimmed) return trimmed;
  }
  return 'Learner';
}

function calculateCurrentStreak(days: string[]): number {
  if (days.length === 0) return 0;

  const learnedDays = new Set(days);
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  let streak = 0;
  while (streak < 366) {
    const key = cursor.toISOString().slice(0, 10);
    if (!learnedDays.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function learningMinutesFromHours(value: unknown): number | undefined {
  const hours = toFiniteNumber(value);
  if (hours === null) return undefined;
  return Math.max(0, Math.round(hours * 60));
}

function sortLeaderboardEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.learnedWords !== a.learnedWords) return b.learnedWords - a.learnedWords;
    if (b.learningWords !== a.learningWords) return b.learningWords - a.learningWords;
    return a.nickname.localeCompare(b.nickname, undefined, { sensitivity: 'base' });
  });
}

async function resolveCurrentIdentity(): Promise<{ userKey: string | null; nickname: string | null }> {
  let session: Awaited<ReturnType<typeof getActiveSession>> = null;
  try {
    session = await getActiveSession();
  } catch (error) {
    console.warn('leaderboard:resolveIdentity', error);
  }
  const sessionUserKey = session?.user_unique_key?.trim() || session?.user?.id?.trim() || '';
  const localUserKey = readLocalStorage(USER_KEY_STORAGE_KEY)?.trim() || '';
  const userKey = sessionUserKey || localUserKey || null;

  const sessionNickname =
    session?.user?.name?.trim() ||
    session?.name?.trim() ||
    session?.user?.nickname?.trim() ||
    session?.nickname?.trim() ||
    '';
  const nickname = sessionNickname || getNicknameLocal()?.trim() || userKey;

  return { userKey, nickname: nickname || null };
}

async function fetchLeaderboardRows(limit: number): Promise<LeaderboardRow[]> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('user_progress_summary')
      .select('user_unique_key, learned_count, learning_count, learning_due_count, learning_time, learned_days, updated_at')
      .order('learned_count', { ascending: false })
      .order('learning_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('leaderboard:fetchTop', error.message);
      return [];
    }

    return Array.isArray(data) ? (data as LeaderboardRow[]) : [];
  } catch (error) {
    console.warn('leaderboard:fetchTop', error);
    return [];
  }
}

function rowsToEntries(rows: LeaderboardRow[], currentUserKey: string | null): LeaderboardEntry[] {
  return rows
    .map((row) => {
      const userKey = typeof row.user_unique_key === 'string' ? row.user_unique_key.trim() : '';
      if (!userKey) return null;
      const learnedDays = toStringArray(row.learned_days);

      return {
        userKey,
        nickname: displayNameFromRow(row, userKey),
        rank: 0,
        learnedWords: toPositiveInteger(row.learned_count),
        learningWords: toPositiveInteger(row.learning_count),
        dueWords: toPositiveInteger(row.learning_due_count),
        streakDays: calculateCurrentStreak(learnedDays),
        learningMinutes: learningMinutesFromHours(row.learning_time),
        isCurrentUser: currentUserKey ? userKey === currentUserKey : false,
      } satisfies LeaderboardEntry;
    })
    .filter((entry): entry is LeaderboardEntry => entry !== null);
}

function applyRanks(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return sortLeaderboardEntries(entries).map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

async function buildCurrentUserEntry(
  userKey: string,
  nickname: string | null,
  rank: number,
  learnedOverride?: number,
  learningOverride?: number,
  dueOverride?: number
): Promise<LeaderboardEntry> {
  let summary: Awaited<ReturnType<typeof getProgressSummary>> = null;
  try {
    summary = await getProgressSummary(userKey);
  } catch (error) {
    console.warn('leaderboard:currentUserSummary', error);
  }
  const learnedDays = summary?.learned_days ?? [];
  return {
    userKey,
    nickname: nickname || userKey,
    rank,
    learnedWords: toPositiveInteger(learnedOverride ?? summary?.learned_count),
    learningWords: toPositiveInteger(learningOverride ?? summary?.learning_count),
    dueWords: toPositiveInteger(dueOverride ?? summary?.learning_due_count),
    streakDays: calculateCurrentStreak(learnedDays),
    learningMinutes: learningMinutesFromHours(summary?.learning_time),
    isCurrentUser: true,
  };
}

export async function getLeaderboardState(
  options: LeaderboardOptions = {}
): Promise<LeaderboardState> {
  const limit = Math.max(1, Math.trunc(options.limit ?? DEFAULT_LIMIT));
  const { userKey, nickname } = await resolveCurrentIdentity();
  const rows = await fetchLeaderboardRows(limit);
  let rankedEntries = applyRanks(rowsToEntries(rows, userKey));

  let currentUserEntry = rankedEntries.find((entry) => entry.isCurrentUser);

  if (userKey && !currentUserEntry) {
    const optimisticRank = rankedEntries.length + 1;
    currentUserEntry = await buildCurrentUserEntry(
      userKey,
      nickname,
      optimisticRank,
      options.currentUserLearnedCount,
      options.currentUserLearningCount,
      options.currentUserDueCount
    );
    rankedEntries = applyRanks([...rankedEntries, currentUserEntry]);
    currentUserEntry = rankedEntries.find((entry) => entry.isCurrentUser) ?? currentUserEntry;
  } else if (currentUserEntry && typeof options.currentUserLearnedCount === 'number') {
    rankedEntries = applyRanks(
      rankedEntries.map((entry) =>
        entry.isCurrentUser
          ? {
              ...entry,
              learnedWords: toPositiveInteger(options.currentUserLearnedCount),
              learningWords: toPositiveInteger(options.currentUserLearningCount, entry.learningWords),
              dueWords: toPositiveInteger(options.currentUserDueCount, entry.dueWords),
            }
          : entry
      )
    );
    currentUserEntry = rankedEntries.find((entry) => entry.isCurrentUser) ?? currentUserEntry;
  }

  return {
    timeframe: 'allTime',
    entries: rankedEntries.slice(0, limit),
    currentUserEntry,
    isLoading: false,
  };
}
