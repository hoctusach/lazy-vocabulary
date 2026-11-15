import type { VocabularyWord } from '@/types/vocabulary';
import { DEFAULT_VOCABULARY_DATA } from '@/data/defaultVocabulary';

export type WordEntry = VocabularyWord;

let cachedWords: WordEntry[] | null = null;
let overrideWords: WordEntry[] | null = null;
let sourceRevision = 0;
const sourceListeners = new Set<() => void>();

function loadWords(): WordEntry[] {
  if (!cachedWords) {
    cachedWords = Object.entries(DEFAULT_VOCABULARY_DATA).flatMap(([category, words]) =>
      (words || []).map((w) => ({ ...w, category }))
    );
  }
  return cachedWords;
}

/** Point search and quiz at the active imported set. Pass null to restore Default. */
export function setAllWordsOverride(words: WordEntry[] | null): void {
  overrideWords = words;
  sourceRevision += 1;
  sourceListeners.forEach((listener) => listener());
}

export function getVocabularySourceRevision(): number {
  return sourceRevision;
}

export function subscribeVocabularySource(listener: () => void): () => void {
  sourceListeners.add(listener);
  return () => sourceListeners.delete(listener);
}

export function loadAllWords(): WordEntry[] {
  if (overrideWords) {
    return overrideWords;
  }
  const words = loadWords();
  console.info(`QuickSearch: loaded ${words.length} words`);
  return words;
}

export { cachedWords as allWords };
