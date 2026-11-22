/**
 * Per-user translation overrides (Pro "Edit translation"). They live ONLY in the user's own storage, keyed by
 * user + word identity. The shared word record (default vocabulary / imported set data) is never modified.
 *
 * Cloud sync lives in translationOverridesSync.ts (table + RPCs from
 * supabase/sql/2026-11-22-user-translation-overrides.sql, already applied). Everything here works with local
 * storage alone, and survives storage that throws (FB-22). Each write also stamps a last-write time (and a
 * tombstone for clears) in a sidecar key so the sync can merge last-write-wins on updated_at.
 */

const USER_KEY_STORAGE_KEY = 'lazyVoca.userKey'; // same key lib/auth.ts caches the signed-in user under
const PREFIX = 'lv.translationOverrides.v1:';
const META_PREFIX = 'lv.translationOverrides.meta.v1:';
export const TRANSLATION_OVERRIDE_EVENT = 'lv:translation-override-changed';

export interface WordIdentity {
  word: string;
  category?: string | null;
  sourceId?: string | null;
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function currentOverrideUser(): string {
  try {
    return safeStorage()?.getItem(USER_KEY_STORAGE_KEY) || 'anon';
  } catch {
    return 'anon';
  }
}

/** Stable id for a word: built-in groups all count as 'default'; imported sets keep their own id. */
export function overrideWordId(w: WordIdentity): string {
  const src = !w.sourceId || w.sourceId === 'default' || w.sourceId.startsWith('default:') ? 'default' : w.sourceId;
  return `${src}::${(w.category ?? '').trim().toLowerCase()}::${w.word.trim().toLowerCase()}`;
}

function read(user: string): Record<string, string> {
  try {
    const raw = safeStorage()?.getItem(PREFIX + user);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** t = epoch ms of the last local write; d = the override was cleared (tombstone). */
export type OverrideMeta = { t: number; d?: boolean };

export function readOverrideMeta(user: string): Record<string, OverrideMeta> {
  try {
    const raw = safeStorage()?.getItem(META_PREFIX + user);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, OverrideMeta>) : {};
  } catch {
    return {};
  }
}

export function readAllOverrides(user = currentOverrideUser()): Record<string, string> {
  return read(user);
}

function writeBoth(user: string, texts: Record<string, string>, meta: Record<string, OverrideMeta>): boolean {
  try {
    const st = safeStorage();
    if (!st) return false;
    st.setItem(PREFIX + user, JSON.stringify(texts));
    try {
      st.setItem(META_PREFIX + user, JSON.stringify(meta));
    } catch {
      /* meta is best effort: without it the server copy simply wins on the next sync */
    }
    return true;
  } catch {
    return false;
  }
}

function emit(id: string, user: string, source: 'local' | 'remote'): void {
  try {
    window.dispatchEvent(new CustomEvent(TRANSLATION_OVERRIDE_EVENT, { detail: { id, user, source } }));
  } catch {
    /* no window */
  }
}

/**
 * Applies a value that came from the cloud (text = null: cleared there). Does not stamp "now", does not
 * trigger a push; emits the change event with source 'remote' so open cards refresh.
 */
export function applyRemoteOverride(user: string, id: string, text: string | null, t: number): boolean {
  const texts = read(user);
  const meta = readOverrideMeta(user);
  if (text) {
    texts[id] = text;
    meta[id] = { t };
  } else {
    delete texts[id];
    meta[id] = { t, d: true };
  }
  const ok = writeBoth(user, texts, meta);
  emit(id, user, 'remote');
  return ok;
}

export function normalizeTranslationText(text: string): string {
  return text.replace(/\r\n?/g, '\n').trim();
}

export function getTranslationOverride(w: WordIdentity, user = currentOverrideUser()): string | undefined {
  const v = read(user)[overrideWordId(w)];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** Saves the override ('' clears it). Returns false if storage refused (the in-memory edit is then lost on reload). */
export function setTranslationOverride(w: WordIdentity, text: string, user = currentOverrideUser()): boolean {
  const next = read(user);
  const meta = readOverrideMeta(user);
  const id = overrideWordId(w);
  const value = normalizeTranslationText(text);
  if (value) next[id] = value;
  else delete next[id];
  meta[id] = value ? { t: Date.now() } : { t: Date.now(), d: true };
  const ok = writeBoth(user, next, meta);
  emit(id, user, 'local');
  return ok;
}

export function clearTranslationOverride(w: WordIdentity, user = currentOverrideUser()): boolean {
  return setTranslationOverride(w, '', user);
}
