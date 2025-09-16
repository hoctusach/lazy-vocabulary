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

export async function ensureUserKey(): Promise<string | null> {
  await ensureAuth();
  const sb = getSupabaseClient();
  if (!sb) return null;

  const nick = lsGet('lazyVoca.nickname') || '';
  if (!nick) return null;

  const cached = lsGet('lazyVoca.userKey');
  if (cached) return cached;

  const { data: userData, error: userError } = await sb.auth.getUser();
  if (userError) {
    console.warn('ensureUserKey:getUser', userError.message);
    return null;
  }
  const userId = userData?.user?.id;
  if (!userId) return null;

  const { data, error } = await sb
    .from('nicknames')
    .select('user_unique_key')
    .eq('name', nick)
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('ensureUserKey:select', error.message);
  }

  let key = data?.user_unique_key ?? null;
  if (!key) {
    const derived = canon(nick);
    const { error: updateError } = await sb
      .from('nicknames')
      .update({ user_unique_key: derived })
      .eq('name', nick)
      .eq('user_id', userId);
    if (updateError) {
      console.warn('ensureUserKey:update', updateError.message);
    } else {
      key = derived;
    }
  }

  if (key) {
    lsSet('lazyVoca.userKey', key);
  }
  return key;
}

export async function markLearnedServerByKey(wordId: string, totalWords: number): Promise<ProgressSummary | null> {
  const key = await ensureUserKey();
  if (!key) return null;

  const sb = getSupabaseClient();
  if (!sb) return null;

  const { data, error } = await sb.rpc('mark_word_learned_by_key', {
    p_user_unique_key: key,
    p_word_id: wordId,
    p_marked_at: new Date().toISOString(),
    p_total_words: Math.max(0, Math.floor(totalWords || 0))
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
      learned_at: current.learned_at || nowISO
    };
  }

  lsSet('learningProgress', JSON.stringify(existing));
}
