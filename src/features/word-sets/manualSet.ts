import type { VocabularyWord } from '@/types/vocabulary';
import { LIMITS } from './parseVocabularyImport';

/** [FB-45] Free users can build a set by hand. File import stays Pro. */
export const MANUAL_SET_MAX_WORDS = 500;
/** [FB-57] Category is one of the six built-in groups (exact strings), never free text. Same list as BUILTIN_GROUPS. */
export const MANUAL_CATEGORIES: readonly string[] = [
  'topic vocab',
  'phrasal verbs',
  'idioms',
  'grammar',
  'phrases, collocations',
  'word formation',
];
export const MANUAL_DEFAULT_CATEGORY = 'topic vocab';

/** The canonical category for a typed/stored value (trim + case-insensitive), or null when it is not one of the six. */
export function canonicalManualCategory(value: string | undefined | null): string | null {
  const t = (value ?? '').trim().toLowerCase();
  return MANUAL_CATEGORIES.find((c) => c === t) ?? null;
}
export const MANUAL_LIMITS = LIMITS; // same per-field limits as file import

export type ManualWordInput = {
  word?: string;
  meaning?: string;
  category?: string;
  translation?: string;
  example?: string;
};

export type ManualFieldErrors = Partial<Record<'word' | 'meaning' | 'category' | 'translation' | 'example' | 'form', string>>;

export type ManualWordResult =
  | { ok: true; word: VocabularyWord }
  | { ok: false; errors: ManualFieldErrors };

const hasLetterOrDigit = (s: string) => /[\p{L}\p{N}]/u.test(s);
const trimField = (s: string | undefined) => (s ?? '').replace(/\r\n?/g, '\n').trim();

/** Identity of a manual word inside its set: case-insensitive word + category (same as the import key, but forgiving). */
export function manualKey(word: string, category?: string): string {
  return `${(category ?? '').trim().toLowerCase()}::${word.trim().toLowerCase()}`;
}

/**
 * Validates one hand-typed word. All fields are trimmed; word + meaning required; category must be one of the six built-in groups (empty = "topic vocab");
 * junk (no letter or digit) rejected; limits match the importer; duplicates (word + category) rejected.
 * `editing` is the key of the word being edited so it does not collide with itself.
 */
export function validateManualWord(
  input: ManualWordInput,
  existing: readonly Pick<VocabularyWord, 'word' | 'category'>[],
  editingKey?: string
): ManualWordResult {
  const errors: ManualFieldErrors = {};
  const word = trimField(input.word);
  const meaning = trimField(input.meaning);
  const rawCategory = trimField(input.category);
  const category = rawCategory ? (canonicalManualCategory(rawCategory) ?? rawCategory) : MANUAL_DEFAULT_CATEGORY;
  const translation = trimField(input.translation);
  const example = trimField(input.example);

  if (!word) errors.word = 'Enter the word.';
  else if (!hasLetterOrDigit(word)) errors.word = 'The word needs at least one letter or number.';
  else if (Array.from(word).length > LIMITS.word) errors.word = `Word can be at most ${LIMITS.word} characters.`;

  if (!meaning) errors.meaning = 'Enter the meaning.';
  else if (!hasLetterOrDigit(meaning)) errors.meaning = 'The meaning needs at least one letter or number.';
  else if (Array.from(meaning).length > LIMITS.meaning) errors.meaning = `Meaning can be at most ${LIMITS.meaning} characters.`;

  if (!MANUAL_CATEGORIES.includes(category)) errors.category = 'Pick a category from the list.';

  if (Array.from(translation).length > LIMITS.translation) errors.translation = `Translation can be at most ${LIMITS.translation} characters.`;
  if (Array.from(example).length > LIMITS.example) errors.example = `Example can be at most ${LIMITS.example} characters.`;

  if (!errors.word && !errors.category) {
    const key = manualKey(word, category);
    if (key !== editingKey && existing.some((w) => manualKey(w.word, w.category) === key)) {
      errors.word = `"${word}" is already in this set under "${category}".`;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, word: { word, meaning, example, translation: translation || undefined, count: 0, category } };
}

/** Validates the set name typed when creating a set. */
export function validateManualSetName(name: string | undefined): string | null {
  const t = (name ?? '').trim();
  if (!t) return 'Enter a name for this set.';
  if (!hasLetterOrDigit(t)) return 'The name needs at least one letter or number.';
  if (Array.from(t).length > 60) return 'Set names can be at most 60 characters.';
  return null;
}
