/**
 * [FB-66] Learning-language profiles. The scan flow never mentions a concrete language: it asks the active profile
 * which OCR script to run, which meaning providers to try and which language code the text is in.
 * Today the only profile is the default one (English / Latin / Free Dictionary); more are added by registering a profile
 * (plus its OCR script / meaning provider) without touching the shared flow.
 */
export type OcrScriptId = 'latin' | 'chinese' | 'devanagari' | 'japanese' | 'korean';

export interface LanguageProfile {
  /** BCP-47 primary subtag of the text being learned, e.g. "en". */
  code: string;
  /** Which OCR recognizer reads this language. */
  script: OcrScriptId;
  /** Ids of the meaning providers (registered in meaning.ts) tried after the app's own words, in order. */
  meaningProviderIds: string[];
  /** Name of the lemmatizer to retry lookups with (languages without simple morphology list none). */
  lemmatizer?: string;
}

const PROFILES = new Map<string, LanguageProfile>();

export const DEFAULT_LEARNING_LANGUAGE = 'en';

export function registerLanguageProfile(p: LanguageProfile): void {
  PROFILES.set(p.code, p);
}

export function getLanguageProfile(code: string = getLearningLanguage()): LanguageProfile {
  return PROFILES.get(code) ?? PROFILES.get(DEFAULT_LEARNING_LANGUAGE)!;
}

/** The language the user is learning. A single place to change when the app learns more than one language. */
export function getLearningLanguage(): string {
  return DEFAULT_LEARNING_LANGUAGE;
}

registerLanguageProfile({ code: 'en', script: 'latin', meaningProviderIds: ['free-dictionary-en'], lemmatizer: 'en' });
