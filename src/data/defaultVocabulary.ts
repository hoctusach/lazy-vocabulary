import data from './defaultVocabulary.json';
import { SheetData } from '@/types/vocabulary';

/**
 * Category spellings that mean the same thing. The server table holds both
 * 'phrases, collocation' (448 rows) and 'phrases, collocations' (221 rows); the app
 * (and generate_daily_selection_v2) only knows the plural form.
 */
const CATEGORY_ALIASES: Record<string, string> = {
  'phrases, collocation': 'phrases, collocations',
};

/** Map 'phrases, collocation' (any case / spacing) to 'phrases, collocations'; other values pass through. */
export function normalizeCategory<T extends string | null | undefined>(category: T): T | string {
  if (typeof category !== 'string') return category;
  const key = category.trim().toLowerCase().replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ');
  return CATEGORY_ALIASES[key] ?? category;
}

/** Normalise sheet names and per-word categories, merging sheets that collapse to the same name. */
export function normalizeSheetCategories(input: SheetData): SheetData {
  const out: SheetData = {};
  for (const [sheet, words] of Object.entries(input)) {
    const name = normalizeCategory(sheet) as string;
    const list = Array.isArray(words) ? words : [];
    const normalized = list.map((w) =>
      w && typeof w.category === 'string' ? { ...w, category: normalizeCategory(w.category) as string } : w
    );
    out[name] = (out[name] ?? []).concat(normalized);
  }
  return out;
}

/** The single bundled copy of the built-in vocabulary (src/data/defaultVocabulary.json). */
export const DEFAULT_VOCABULARY_DATA: SheetData = normalizeSheetCategories(data as SheetData);

let cachedTotal: number | null = null;

/** Number of distinct word keys in the built-in set (what the server counts as one row each). */
export function getDefaultVocabularyTotal(): number {
  if (cachedTotal === null) {
    const keys = new Set<string>();
    for (const words of Object.values(DEFAULT_VOCABULARY_DATA)) {
      for (const w of words ?? []) {
        if (w && typeof w.word === 'string' && w.word.trim()) keys.add(w.word);
      }
    }
    cachedTotal = keys.size;
  }
  return cachedTotal;
}
