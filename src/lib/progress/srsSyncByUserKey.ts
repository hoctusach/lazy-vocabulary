import { canonNickname } from '@/core/nickname';
import { getActiveSession } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { LearnedWordUpsert } from '@/lib/db/learned';
import { persistProgressSummaryLocal } from './progressSummary';

export type ProgressSummary = {
  learning_count: number;
  learned_count: number;
  learning_due_count: number;
  remaining_count: number;
  learning_time: number;
  learned_days: string[];
  updated_at: string | null;
};

// Hard-coded total number of vocabulary words used for progress calculations
export const TOTAL_WORDS = 3035;

function lsGet(key: string) {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // ignore storage errors
  }
}

const LEGACY_PROGRESS_KEYS = ['status', 'isLearned', 'reviewCount', 'mark_learned_at', 'srs_state'];

type LearningProgressState = Record<string, Record<string, any>>;

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseLearningProgress(): Record<string, any> {
  const raw = lsGet('learningProgress');
  if (!raw) return {};
  try {
    const candidate = JSON.parse(raw) as unknown;
    return isPlainObject(candidate) ? candidate : {};
  } catch {
    return {};
  }
}

function loadLearningProgressForUser(userKey: string): {
  state: LearningProgressState;
  userProgress: Record<string, any>;
} {
  const raw = parseLearningProgress();
  const entries = Object.entries(raw);

  const looksLegacy =
    entries.length > 0 &&
    raw[userKey] === undefined &&
    entries.every(([, value]) => {
      if (!isPlainObject(value)) return false;
      const keys = Object.keys(value);
      return keys.some((keyName) => LEGACY_PROGRESS_KEYS.includes(keyName));
    });

  if (looksLegacy) {
    const userProgress = entries.reduce<Record<string, any>>((acc, [wordKey, value]) => {
      if (isPlainObject(value)) {
        acc[wordKey] = { ...value };
      }
      return acc;
    }, {});
    return { state: {}, userProgress };
  }

  const state = entries.reduce<LearningProgressState>((acc, [entryKey, entryValue]) => {
    if (isPlainObject(entryValue)) {
      acc[entryKey] = { ...entryValue };
    }
    return acc;
  }, {});

  const candidate = Object.prototype.hasOwnProperty.call(state, userKey)
    ? (state as Record<string, unknown>)[userKey]
    : undefined;
  const userProgress = isPlainObject(candidate) ? { ...candidate } : {};
  return { state, userProgress };
}

function persistLearningProgress(
  userKey: string,
  state: LearningProgressState,
  userProgress: Record<string, any>
): void {
  try {
    const nextState: LearningProgressState = { ...state, [userKey]: userProgress };
    lsSet('learningProgress', JSON.stringify(nextState));
  } catch (error) {
    console.warn('learningProgress:persist', error);
  }
}

/**
 * Ensures and returns the current user's user_unique_key.
 * - Reads from localStorage cache if available
 * - Otherwise derives the key from the active session or stored nickname
 * - Caches the key in localStorage['lazyVoca.userKey']
 */
export async function ensureUserKey(): Promise<string | null> {
  const cached = (lsGet('lazyVoca.userKey') ?? '').trim();
  if (cached) return cached;

  const storedNickname = (lsGet('lazyVoca.nickname') ?? '').trim();
  const activeSession = await getActiveSession();

  const nicknameSource =
    activeSession?.nickname?.trim().length ? activeSession.nickname : storedNickname;
  const derivedKey = nicknameSource ? canonNickname(nicknameSource) : '';
  const fallbackKey = activeSession?.user_unique_key?.trim() ?? '';
  const userKey = derivedKey || (fallbackKey ? canonNickname(fallbackKey) : '');

  if (!userKey) {
    return null;
  }

  lsSet('lazyVoca.userKey', userKey);
  return userKey;
}

/**
 * Called after marking a word learned locally. Also persists to server
 * and stores the returned summary counts in localStorage['progressSummary'].
 */
export async function markLearnedServerByKey(
  wordId: string,
  payload?: LearnedWordUpsert | null
): Promise<ProgressSummary | null> {
  const session = await getActiveSession();
  if (!session?.user_unique_key) return null;

  const key = await ensureUserKey();
  if (!key) return null;

  const sb = getSupabaseClient();
  if (!sb) return null;
  const toIso = (value?: string | null) => {
    if (!value) return null;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return null;
    return new Date(parsed).toISOString();
  };

  const toInt = (value?: number | null) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return Math.trunc(value);
  };

  const markedAt = toIso(payload?.learned_at) ?? new Date().toISOString();
  const rpcPayload = {
    p_user_unique_key: key,
    p_word_id: wordId,
    p_marked_at: markedAt,
    p_total_words: TOTAL_WORDS,
    p_in_review_queue: payload?.in_review_queue ?? false,
    p_review_count: toInt(payload?.review_count ?? null),
    p_last_review_at: toIso(payload?.last_review_at ?? null),
    p_next_review_at: toIso(payload?.next_review_at ?? null),
    p_next_display_at: toIso(payload?.next_display_at ?? null),
    p_last_seen_at: toIso(payload?.last_seen_at ?? null),
    p_srs_interval_days: toInt(payload?.srs_interval_days ?? null),
    p_srs_ease: payload?.srs_ease ?? null,
    p_srs_state: payload?.srs_state ?? null,
  };

  const { data, error } = await sb.rpc('mark_word_learned_by_key', rpcPayload);

  if (error) {
    console.warn('mark_word_learned_by_key', error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  try {
    const { state, userProgress } = loadLearningProgressForUser(rpcPayload.p_user_unique_key);
    const existingEntry = userProgress[rpcPayload.p_word_id];
    const nextEntry = isPlainObject(existingEntry) ? { ...existingEntry } : {};
    nextEntry.srs_state = 'learned';
    nextEntry.mark_learned_at = markedAt;
    userProgress[rpcPayload.p_word_id] = nextEntry;
    persistLearningProgress(rpcPayload.p_user_unique_key, state, userProgress);
  } catch (storageError) {
    console.warn('mark_word_learned_by_key:local_sync', storageError);
  }

  const summary: ProgressSummary = {
    learning_count: data.learning_count ?? 0,
    learned_count: data.learned_count ?? 0,
    learning_due_count: data.learning_due_count ?? 0,
    remaining_count: data.remaining_count ?? Math.max(TOTAL_WORDS - (data.learned_count ?? 0), 0),
    learning_time: data.learning_time ?? 0,
    learned_days: Array.isArray(data.learned_days) ? data.learned_days : [],
    updated_at: typeof data.updated_at === 'string' ? data.updated_at : null,
  };

  persistProgressSummaryLocal(summary);
  return summary;
}

/**
 * On app load (and device changes), read learned word ids from server for this user key
 * and idempotently upgrade local learningProgress so those words are marked learned.
 */
export async function bootstrapLearnedFromServerByKey(): Promise<void> {
  const session = await getActiveSession();
  if (!session?.user_unique_key) return;

  const key = await ensureUserKey();
  if (!key) return;

  const sb = getSupabaseClient();
  if (!sb) return;
  const { data, error } = await sb
    .from('learned_words')
    .select('word_id')
    .eq('user_unique_key', key);

  if (error) {
    console.warn('bootstrapLearnedFromServerByKey', error.message);
    return;
  }

  const rows: { word_id: string | null }[] = Array.isArray(data)
    ? (data as { word_id: string | null }[])
    : [];

  const { state, userProgress } = loadLearningProgressForUser(key);

  const nowISO = new Date().toISOString();

  for (const entry of rows) {
    const wordId = typeof entry?.word_id === 'string' ? entry.word_id : '';
    if (!wordId) continue;
    const current = userProgress[wordId] || {};
    const statusValue = Number(current.status ?? current.status_value ?? 0);
    const safeStatus = Number.isFinite(statusValue) ? statusValue : 0;
    userProgress[wordId] = {
      ...current,
      status: Math.max(3, safeStatus),
      isLearned: true,
      learned_at: current.learned_at || nowISO,
    };
  }

  persistLearningProgress(key, state, userProgress);
}
