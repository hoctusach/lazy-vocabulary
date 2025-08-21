import type { VocabularyWord } from '@/types/vocabulary';
import { loadAllWords } from '@/utils/allWords';
import { normalizeQuery } from '@/utils/text/normalizeQuery';

export interface IndexedWord {
  word: VocabularyWord;
  normalizedKey: string;
  tokens: string[];
  frequency: number;
}

let cachedIndex: IndexedWord[] | null = null;

export const loadVocabularyIndex = (): IndexedWord[] => {
  if (cachedIndex) return cachedIndex;

  const words = loadAllWords();
  cachedIndex = words.map(word => {
    const normalizedKey = normalizeQuery(word.word).toLowerCase();
    const tokens = normalizedKey.split(/\s+/).filter(Boolean);
    const frequency = typeof word.count === 'number'
      ? word.count
      : parseInt(String(word.count), 10) || 0;
    return { word, normalizedKey, tokens, frequency };
  });
  return cachedIndex;
};

export default loadVocabularyIndex;
