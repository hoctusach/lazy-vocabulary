import { DEFAULT_VOCABULARY_DATA } from '@/data/defaultVocabulary';
import { flattenSheets } from '@/features/word-sets/vocabularySetStore';
import { parseWordAnnotations } from '@/utils/text/parseWordAnnotations';
import type { VocabularyWord } from '@/types/vocabulary';
import { getLanguageProfile, type LanguageProfile } from './languages';

/**
 * [FB-66] Meaning lookup. The app's own words are always tried first (any language); then the providers the language
 * profile lists. A provider is one language's dictionary source; nothing here is English-specific except the English
 * provider module itself.
 */
export interface MeaningHit {
  meaning: string;
  /** Pronunciation in the same `/…/` form the word field already uses, when the source supplies it. */
  ipa?: string;
  example?: string;
  category?: string;
  translation?: string;
}

export type MeaningResult =
  | { status: 'found'; hit: MeaningHit; source: string }
  | { status: 'not-found' }
  | { status: 'offline' }
  | { status: 'error' };

export interface MeaningProvider {
  id: string;
  /** Language code this provider serves. */
  language: string;
  lookup(phrase: string, signal?: AbortSignal): Promise<MeaningResult>;
}

const PROVIDERS = new Map<string, MeaningProvider>();
export const registerMeaningProvider = (p: MeaningProvider) => { PROVIDERS.set(p.id, p); };
export const getMeaningProvider = (id: string) => PROVIDERS.get(id);

/** Words the app already has, for the first lookup step. Injected in tests. */
export type LocalWords = () => VocabularyWord[];
let defaultLocal: VocabularyWord[] | null = null;
export const bundledWords: LocalWords = () => (defaultLocal ??= flattenSheets(DEFAULT_VOCABULARY_DATA));

const norm = (s: string) => s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
/** "To get around to" / "Knuckle down (informal)" -> comparable core. */
const core = (word: string) => norm(parseWordAnnotations(word).main).replace(/^to\s+/, '');

export function lookupLocal(phrase: string, words: VocabularyWord[]): MeaningHit | null {
  const key = core(phrase);
  if (!key) return null;
  const w = words.find((x) => core(x.word) === key && x.meaning);
  if (!w) return null;
  const ipa = parseWordAnnotations(w.word).annotations.find((a) => /^\/.+\/$/.test(a));
  return { meaning: w.meaning, ipa, example: w.example || undefined, category: w.category, translation: w.translation || undefined };
}

export interface LookupOptions {
  profile?: LanguageProfile;
  local?: LocalWords;
  /** Overrides the providers named by the profile (tests). */
  providers?: MeaningProvider[];
  signal?: AbortSignal;
}

/** Local words first, then each of the language's providers; the first hit wins, otherwise the most informative failure. */
export async function lookupMeaning(phrase: string, opts: LookupOptions = {}): Promise<MeaningResult> {
  const profile = opts.profile ?? getLanguageProfile();
  const local = lookupLocal(phrase, (opts.local ?? bundledWords)());
  if (local) return { status: 'found', hit: local, source: 'app' };
  const providers = opts.providers ?? profile.meaningProviderIds.map(getMeaningProvider).filter((p): p is MeaningProvider => Boolean(p));
  let failure: MeaningResult = { status: 'not-found' };
  for (const p of providers) {
    const r = await p.lookup(phrase, opts.signal);
    if (r.status === 'found') return r;
    if (r.status === 'offline' || (r.status === 'error' && failure.status === 'not-found')) failure = r;
  }
  return failure;
}
