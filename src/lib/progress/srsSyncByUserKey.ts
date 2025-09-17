import { canonNickname } from '@/core/nickname';
import { ensureSessionForNickname, getActiveSession, getStoredPasscode } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabaseClient';

export type ProgressSummary = {
  learning_count: number;
  learned_count: number;
  learning_due_count: number;
  remaining_count: number;
};

type NicknameIdentityRow = {
  user_unique_key: string | null;
  name: string | null;
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

/**
 * Ensures and returns the current user's user_unique_key.
 * Source of truth: nicknames.user_unique_key.
 * - Reads from localStorage cache if available
 * - Otherwise tries nicknames; if missing, derives from nickname (or user id) and upserts into nicknames
 * - Caches the key in localStorage['lazyVoca.userKey']
 */
export async function ensureUserKey(): Promise<string | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;

  const storedNickname = (lsGet('lazyVoca.nickname') ?? '').trim();
  const storedPasscode = getStoredPasscode() ?? undefined;
  const session = storedNickname
    ? await ensureSessionForNickname(storedNickname, storedPasscode)
    : await getActiveSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  // cache hit
  const cached = lsGet('lazyVoca.userKey');
  if (cached) return cached;

  // who am I?
  // 1) Try read from nicknames
  const { data: nicknameRow, error: nicknameError } = await sb
    .from('nicknames')
    .select('user_unique_key, name')
    .eq('user_id', userId)
    .maybeSingle<NicknameIdentityRow>();

  if (nicknameError) {
    console.warn('ensureUserKey:nicknames select', nicknameError.message);
  }

  let key = (nicknameRow?.user_unique_key ?? '').trim();

  // 2) If missing, derive and upsert into nicknames (onConflict: user_id)
  if (!key) {
    const storedNick = (lsGet('lazyVoca.nickname') || '').trim();
    const existingName = (nicknameRow?.name ?? '').trim();
    const sanitizedUid = userId.replace(/-/g, '');

    const preferredName = storedNick.length >= 3 ? storedNick : existingName;
    const fallbackName = preferredName.length >= 3 ? preferredName : `Learner-${sanitizedUid}`;
    const candidates = Array.from(
      new Set(
        [preferredName, fallbackName, `Learner-${sanitizedUid}`]
          .map((value) => value.trim())
          .filter((value) => value.length >= 3)
      )
    );

    for (const candidate of candidates) {
      const { data: upserted, error: upErr } = await sb
        .from('nicknames')
        .upsert({ user_id: userId, name: candidate }, { onConflict: 'user_id' })
        .select('user_unique_key')
        .maybeSingle<Pick<NicknameIdentityRow, 'user_unique_key'>>();

      if (upErr) {
        if (upErr.code === '23505') {
          // nickname taken, try next candidate
          continue;
        }
        console.warn('ensureUserKey:nicknames upsert', upErr.message);
        return null;
      }

      const upsertedKey = (upserted?.user_unique_key ?? '').trim();
      if (upsertedKey) {
        key = upsertedKey;
        break;
      }
    }

    if (!key) {
      const fallbackNickname = `Learner-${sanitizedUid}`;
      const { data: upserted, error: finalErr } = await sb
        .from('nicknames')
        .upsert({ user_id: userId, name: fallbackNickname }, { onConflict: 'user_id' })
        .select('user_unique_key')
        .maybeSingle<Pick<NicknameIdentityRow, 'user_unique_key'>>();

      if (finalErr) {
        console.warn('ensureUserKey:nicknames final upsert', finalErr.message);
        return null;
      }
      const fallbackKey = (upserted?.user_unique_key ?? '').trim();
      key = fallbackKey.length ? fallbackKey : canonNickname(fallbackNickname);
    }
  }

  if (key) {
    lsSet('lazyVoca.userKey', key);
  }
  return key;
}

/**
 * Called after marking a word learned locally. Also persists to server
 * and stores the returned summary counts in localStorage['progressSummary'].
 */
export async function markLearnedServerByKey(
  wordId: string
): Promise<ProgressSummary | null> {
  const session = await getActiveSession();
  if (!session?.user?.id) return null;

  const key = await ensureUserKey();
  if (!key) return null;

  const sb = getSupabaseClient();
  if (!sb) return null;

  const { data, error } = await sb.rpc('mark_word_learned_by_key', {
    p_user_unique_key: key,
    p_word_id: wordId,
    p_marked_at: new Date().toISOString(),
    p_total_words: TOTAL_WORDS,
  });

  if (error) {
    console.warn('mark_word_learned_by_key', error.message);
    return null;
  }

  if (data) {
    lsSet('progressSummary', JSON.stringify(data));
  }

  return data as ProgressSummary;
}

/**
 * On app load (and device changes), read learned word ids from server for this user key
 * and idempotently upgrade local learningProgress so those words are marked learned.
 */
export async function bootstrapLearnedFromServerByKey(): Promise<void> {
  const session = await getActiveSession();
  if (!session?.user?.id) return;

  const key = await ensureUserKey();
  if (!key) return;

  const sb = getSupabaseClient();
  if (!sb) return;

  const { data, error } = await sb.rpc('get_learned_words_by_key', { p_user_unique_key: key });
  if (error || !Array.isArray(data)) return;

  const raw = lsGet('learningProgress');
  const existing: Record<string, any> = raw
    ? (() => {
        try {
          return JSON.parse(raw) as Record<string, any>;
        } catch {
          return {} as Record<string, any>;
        }
      })()
    : {};

  const nowISO = new Date().toISOString();

  for (const entry of data as unknown[]) {
    if (typeof entry !== 'string' || !entry) continue;
    const current = existing[entry] || {};
    const statusValue = Number(current.status ?? current.status_value ?? 0);
    const safeStatus = Number.isFinite(statusValue) ? statusValue : 0;
    existing[entry] = {
      ...current,
      status: Math.max(3, safeStatus),
      isLearned: true,
      learned_at: current.learned_at || nowISO,
    };
  }

  lsSet('learningProgress', JSON.stringify(existing));
}
