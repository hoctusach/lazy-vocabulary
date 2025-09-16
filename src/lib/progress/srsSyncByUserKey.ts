import { getSupabaseClient } from '@/lib/supabaseClient';

export type ProgressSummary = {
  learning_count: number;
  learned_count: number;
  learning_due_count: number;
  remaining_count: number;
};

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

function canon(value: string) {
  return (value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '');
}

export async function ensureAuth() {
  const sb = getSupabaseClient();
  if (!sb) return;

  const { data, error } = await sb.auth.getUser();
  if (error) {
    console.warn('ensureAuth:getUser', error.message);
  }
  if (data?.user) return;

  const { error: signInError } = await sb.auth.signInAnonymously();
  if (signInError) {
    throw signInError;
  }
}

/**
 * Ensures and returns the current user's user_unique_key.
 * Source of truth: profiles.user_unique_key (NOT nicknames).
 * - Reads from localStorage cache if available
 * - Otherwise tries profiles; if missing, derives from nickname (or user id) and upserts into profiles
 * - Caches the key in localStorage['lazyVoca.userKey']
 */
export async function ensureUserKey(): Promise<string | null> {
  await ensureAuth();
  const sb = getSupabaseClient();
  if (!sb) return null;

  // cache hit
  const cached = lsGet('lazyVoca.userKey');
  if (cached) return cached;

  // who am I?
  const { data: userData, error: userError } = await sb.auth.getUser();
  if (userError) {
    console.warn('ensureUserKey:getUser', userError.message);
    return null;
  }
  const userId = userData?.user?.id;
  if (!userId) return null;

  // 1) Try read from profiles
  const { data: profile, error: profErr } = await sb
    .from('profiles')
    .select('user_unique_key')
    .eq('user_id', userId)
    .maybeSingle();

  if (profErr) {
    console.warn('ensureUserKey:profiles select', profErr.message);
  }

  let key: string | null = profile?.user_unique_key ?? null;

  // 2) If missing, derive and upsert into profiles (onConflict: user_id)
  if (!key) {
    const nick = lsGet('lazyVoca.nickname') || '';
    const derivedFromNick = canon(nick);
    // final fallback: compress user id (unique, no spaces)
    const fallbackFromUid = userId.replace(/-/g, '');
    const derived = derivedFromNick || fallbackFromUid;

    const { error: upErr } = await sb
      .from('profiles')
      .upsert({ user_id: userId, user_unique_key: derived }, { onConflict: 'user_id' });

    if (upErr) {
      console.warn('ensureUserKey:profiles upsert', upErr.message);
      return null;
    }
    key = derived;
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
  wordId: string,
  totalWords: number
): Promise<ProgressSummary | null> {
  const key = await ensureUserKey();
  if (!key) return null;

  const sb = getSupabaseClient();
  if (!sb) return null;

  const { data, error } = await sb.rpc('mark_word_learned_by_key', {
    p_user_unique_key: key,
    p_word_id: wordId,
    p_marked_at: new Date().toISOString(),
    p_total_words: Math.max(0, Math.floor(totalWords || 0)),
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
