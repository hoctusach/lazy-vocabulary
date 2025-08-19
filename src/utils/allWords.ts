import type { VocabularyWord } from '@/types/vocabulary';
import { DEFAULT_VOCABULARY_DATA } from '@/data/defaultVocabulary';

export type WordEntry = VocabularyWord;

let cachedWords: WordEntry[] | null = null;

function loadWords(): WordEntry[] {
  if (!cachedWords) {
    cachedWords = Object.entries(DEFAULT_VOCABULARY_DATA).flatMap(([category, words]) =>
      (words || []).map((w) => ({ ...w, category }))
    );
  }
  return cachedWords;
}

export function loadAllWords(): WordEntry[] {
  const words = loadWords();
  console.info(`QuickSearch: loaded ${words.length} words`);
  return words;
}

export { cachedWords as allWords };
