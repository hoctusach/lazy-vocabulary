import type { VocabularyWord } from '@/types/vocabulary';

export interface SearchResultRow {
  word_id: string;
  word: string;
  category: string | null;
  meaning: string;
  example: string;
  translation: string | null;
  match_rank: number;
}

const keyOf = (word: string, category: string | null | undefined) =>
  `${(category ?? '').trim().toLowerCase()}::${word.trim().toLowerCase()}`;

/** Wrap a word from the on-device set so it can sit in the same list as server rows. */
export function localWordToResult(word: VocabularyWord): SearchResultRow {
  return {
    word_id: `local::${keyOf(word.word, word.category)}`,
    word: word.word,
    category: word.category ?? null,
    meaning: word.meaning,
    example: word.example,
    translation: word.translation ?? null,
    match_rank: 0,
  };
}

/**
 * Words from the active on-device set come first (they work offline and cover
 * imported sets the server has never seen); server rows follow, minus duplicates.
 */
export function mergeSearchResults(local: SearchResultRow[], server: SearchResultRow[]): SearchResultRow[] {
  const seen = new Set<string>();
  const merged: SearchResultRow[] = [];
  for (const row of [...local, ...server]) {
    const key = keyOf(row.word, row.category);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }
  return merged;
}
