/**
 * Per-user translation overrides (Pro "Edit translation"). They live ONLY in the user's own storage, keyed by
 * user + word identity. The shared word record (default vocabulary / imported set data) is never modified.
 *
 * Cloud sync is not wired: supabase/sql/2026-11-22-user-translation-overrides.sql (NOT APPLIED) is the table
 * for it. Everything here works with local storage alone, and survives storage that throws (FB-22).
 */

const USER_KEY_STORAGE_KEY = 'lazyVoca.userKey'; // same key lib/auth.ts caches the signed-in user under
const PREFIX = 'lv.translationOverrides.v1:';
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
  const value = normalizeTranslationText(text);
  if (value) next[overrideWordId(w)] = value;
  else delete next[overrideWordId(w)];
  let ok = true;
  try {
    safeStorage()?.setItem(PREFIX + user, JSON.stringify(next));
    if (!safeStorage()) ok = false;
  } catch {
    ok = false;
  }
  try {
    window.dispatchEvent(new CustomEvent(TRANSLATION_OVERRIDE_EVENT, { detail: { id: overrideWordId(w) } }));
  } catch {
    /* no window */
  }
  return ok;
}

export function clearTranslationOverride(w: WordIdentity, user = currentOverrideUser()): boolean {
  return setTranslationOverride(w, '', user);
}
