import { canonNickname } from '@/core/nickname';
import { getActiveSession } from '@/lib/auth';
import { dispatchUserKeyChange } from '@/lib/userKeyEvents';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { LearnedWordUpsert } from '@/lib/db/learned';
import type { LearnedWordRow } from './learnedWordStats';

// Hard-coded total number of vocabulary words used for progress calculations
export const TOTAL_WORDS = 3261;

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
  dispatchUserKeyChange(userKey);
  return userKey;
}

/**
 * Called after marking a word learned locally. Persists to the server and
 * returns the full learned_words rows so the client can derive summary data
 * without additional round-trips.
 */
export async function markLearnedServerByKey(
  wordId: string,
  payload?: LearnedWordUpsert | null
): Promise<LearnedWordRow[] | null> {
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

  const rpcPayload = {
    user_unique_key: key,
    word_id: wordId,
  };

  const { data, error } = await sb.rpc('mark_word_learned_by_key', rpcPayload);

  if (error) {
    console.warn('mark_word_learned_by_key', error.message);
    return null;
  }

  const rawRows: LearnedWordRow[] = Array.isArray(data)
    ? (data as LearnedWordRow[])
    : [];

  const normalisedRows = rawRows
    .map((row) => toLearnedWordRow(row))
    .filter((row): row is LearnedWordRow => row !== null);

  if (normalisedRows.length === 0) {
    return [];
  }

  try {
    const { state, userProgress } = loadLearningProgressForUser(rpcPayload.user_unique_key);
    let didUpdate = false;
    const fallbackMarkedAt = toIso(payload?.learned_at) ?? new Date().toISOString();

    for (const row of normalisedRows) {
      const learnedWordId = typeof row.word_id === 'string' ? row.word_id : '';
      if (!learnedWordId) continue;
      if ((row.srs_state ?? '').toLowerCase() !== 'learned') continue;

      const existingEntry = userProgress[learnedWordId];
      const nextEntry = isPlainObject(existingEntry) ? { ...existingEntry } : {};
      nextEntry.srs_state = 'learned';
      nextEntry.mark_learned_at =
        toIso(row.learned_at) ?? toIso(row.last_review_at) ?? fallbackMarkedAt;
      userProgress[learnedWordId] = nextEntry;
      didUpdate = true;
    }

    if (didUpdate) {
      persistLearningProgress(rpcPayload.user_unique_key, state, userProgress);
    }
  } catch (storageError) {
    console.warn('mark_word_learned_by_key:local_sync', storageError);
  }

  return normalisedRows;
}

function toLearnedWordRow(value: unknown): LearnedWordRow | null {
  if (!isPlainObject(value)) return null;
  const ensureNumber = (candidate: unknown): number | null => {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
    return null;
  };

  return {
    word_id: typeof value.word_id === 'string' ? value.word_id : null,
    srs_state: typeof value.srs_state === 'string' ? value.srs_state : null,
    learned_at: typeof value.learned_at === 'string' ? value.learned_at : null,
    mark_learned_at: typeof value.mark_learned_at === 'string' ? value.mark_learned_at : null,
    last_review_at: typeof value.last_review_at === 'string' ? value.last_review_at : null,
    next_review_at: typeof value.next_review_at === 'string' ? value.next_review_at : null,
    next_display_at: typeof value.next_display_at === 'string' ? value.next_display_at : null,
    in_review_queue:
      typeof value.in_review_queue === 'boolean'
        ? value.in_review_queue
        : null,
    review_count: ensureNumber(value.review_count),
    srs_interval_days: ensureNumber(value.srs_interval_days),
    srs_ease: ensureNumber(value.srs_ease),
    is_today_selection:
      typeof value.is_today_selection === 'boolean'
        ? value.is_today_selection
        : null,
    due_selected_today:
      typeof value.due_selected_today === 'boolean'
        ? value.due_selected_today
        : null,
    category: typeof value.category === 'string' ? value.category : null,
    word: typeof value.word === 'string' ? value.word : null,
  };
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
