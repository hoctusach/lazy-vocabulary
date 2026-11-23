import type { VocabularyWord } from '@/types/vocabulary';

export const WORD_LIMITS = {
  word: 100,
  meaning: 500,
  example: 1000,
  translation: 500,
  category: 40,
  setName: 60,
} as const;

/** Categories the app labels nicely. Any other short text is accepted as a custom category. */
export const KNOWN_CATEGORIES = [
  'phrasal verbs',
  'idioms',
  'topic vocab',
  'grammar',
  'phrases, collocations',
  'word formation',
] as const;

export const DEFAULT_CATEGORY = 'imported';

/**
 * Trim, normalise to NFC, drop control characters and cap the length.
 * Every script is kept (Vietnamese, Thai, Arabic, CJK, emoji...).
 */
export function cleanUserText(value: unknown, max: number): string {
  if (value == null) return '';
  let text = '';
  for (const char of String(value).normalize('NFC')) {
    const code = char.codePointAt(0) ?? 0;
    const isControl = code < 32 || (code >= 127 && code < 160);
    if (isControl && code !== 10 && code !== 13 && code !== 9) continue;
    // Zero-width and bidi override characters hide text from the learner.
    if ((code >= 0x200b && code <= 0x200f) || (code >= 0x202a && code <= 0x202e) || code === 0xfeff) continue;
    text += char;
  }
  text = text.trim();
  return Array.from(text).length > max ? Array.from(text).slice(0, max).join('') : text;
}

const MARKUP = /<\s*\/?\s*[a-z!][^>]*>/i;

function checkField(label: string, raw: string, max: number, required: boolean, errors: Record<string, string>, key: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    if (required) errors[key] = `${label} is required.`;
    return;
  }
  if (Array.from(trimmed).length > max) {
    errors[key] = `${label} can be at most ${max} characters.`;
    return;
  }
  if (MARKUP.test(trimmed)) {
    errors[key] = `${label} cannot contain HTML tags.`;
  }
}

export interface WordInput {
  word: string;
  meaning: string;
  example?: string;
  translation?: string;
  category?: string;
}

export type WordValidation =
  | { ok: true; value: VocabularyWord }
  | { ok: false; errors: Record<string, string> };

/** Validate one hand-typed word. Pass the words already in the set to catch duplicates. */
export function validateWordInput(input: WordInput, existing: VocabularyWord[] = []): WordValidation {
  const errors: Record<string, string> = {};
  const raw = {
    word: input.word ?? '',
    meaning: input.meaning ?? '',
    example: input.example ?? '',
    translation: input.translation ?? '',
    category: input.category ?? '',
  };
  checkField('Word', raw.word, WORD_LIMITS.word, true, errors, 'word');
  checkField('Meaning', raw.meaning, WORD_LIMITS.meaning, true, errors, 'meaning');
  checkField('Example', raw.example, WORD_LIMITS.example, false, errors, 'example');
  checkField('Translation', raw.translation, WORD_LIMITS.translation, false, errors, 'translation');
  checkField('Category', raw.category, WORD_LIMITS.category, false, errors, 'category');

  const word = cleanUserText(raw.word, WORD_LIMITS.word);
  const meaning = cleanUserText(raw.meaning, WORD_LIMITS.meaning);
  if (!errors.word && !word) errors.word = 'Word is required.';
  if (!errors.meaning && !meaning) errors.meaning = 'Meaning is required.';
  const category = cleanUserText(raw.category, WORD_LIMITS.category).toLowerCase() || DEFAULT_CATEGORY;

  if (!errors.word) {
    const duplicate = existing.some(
      (item) =>
        item.word.trim().toLowerCase() === word.toLowerCase() &&
        (item.category || DEFAULT_CATEGORY).toLowerCase() === category
    );
    if (duplicate) errors.word = `"${word}" is already in the ${category} category of this set.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const translation = cleanUserText(raw.translation, WORD_LIMITS.translation);
  return {
    ok: true,
    value: {
      word,
      meaning,
      example: cleanUserText(raw.example, WORD_LIMITS.example),
      count: 0,
      category,
      ...(translation ? { translation } : {}),
    },
  };
}

/** Validate a set name against the names already used. Returns an error message or null. */
export function validateSetName(name: string, existingNames: string[] = [], ignoreName?: string): string | null {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return 'Enter a name for this set.';
  if (Array.from(trimmed).length > WORD_LIMITS.setName) {
    return `Set names can be at most ${WORD_LIMITS.setName} characters.`;
  }
  if (MARKUP.test(trimmed)) return 'Set names cannot contain HTML tags.';
  const lower = trimmed.toLowerCase();
  const clash = existingNames.some(
    (item) => item.trim().toLowerCase() === lower && item.trim().toLowerCase() !== (ignoreName ?? '').trim().toLowerCase()
  );
  return clash ? 'You already have a set with this name.' : null;
}
