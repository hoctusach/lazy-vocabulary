import { cleanUserText, WORD_LIMITS } from '@/features/word-sets/wordValidation';

const KEY = 'lv.translationOverrides.v1';
const EVENT = 'lv:translation-overrides';

type OverrideMap = Record<string, string>;

function overrideKey(setId: string, word: string, category?: string): string {
  return `${setId}::${(category ?? '').trim()}::${word.trim()}`;
}

function read(): OverrideMap {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as OverrideMap) : {};
  } catch {
    return {};
  }
}

export function getTranslationOverride(setId: string, word: string, category?: string): string {
  return read()[overrideKey(setId, word, category)] ?? '';
}

/** Save the learner's own translation (any language). A blank value removes it. */
export function setTranslationOverride(
  setId: string,
  word: string,
  category: string | undefined,
  value: string
): { ok: true } | { ok: false; error: string } {
  const cleaned = cleanUserText(value, WORD_LIMITS.translation);
  if (/<\s*\/?\s*[a-z!][^>]*>/i.test(cleaned)) {
    return { ok: false, error: 'Translation cannot contain HTML tags.' };
  }
  if (Array.from(String(value ?? '').trim()).length > WORD_LIMITS.translation) {
    return { ok: false, error: `Translation can be at most ${WORD_LIMITS.translation} characters.` };
  }
  const map = read();
  const key = overrideKey(setId, word, category);
  if (cleaned) map[key] = cleaned;
  else delete map[key];
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    return { ok: false, error: 'Could not save on this device.' };
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
  return { ok: true };
}

export function subscribeTranslationOverrides(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

export function deviceLanguage(): string {
  if (typeof navigator === 'undefined') return 'en';
  return (navigator.languages?.[0] || navigator.language || 'en').toLowerCase();
}

/**
 * What to show on the card.
 * 1. The learner's own value always wins, whatever language it is in.
 * 2. Otherwise the stored default: for the built-in set it is Vietnamese, so it is
 *    only shown on Vietnamese devices. Imported/created sets carry the user's own text.
 * 3. Otherwise nothing; the card shows the edit icon.
 */
export function resolveTranslation(opts: {
  override?: string;
  defaultValue?: string | null;
  builtinSet: boolean;
  deviceLang?: string;
}): string {
  const override = (opts.override ?? '').trim();
  if (override) return override;
  const fallback = (opts.defaultValue ?? '').trim();
  if (!fallback) return '';
  if (!opts.builtinSet) return fallback;
  return (opts.deviceLang ?? deviceLanguage()).startsWith('vi') ? fallback : '';
}
