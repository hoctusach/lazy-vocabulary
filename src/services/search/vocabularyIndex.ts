import { loadAllWords, WordEntry } from '@/utils/allWords';
import type { VocabularyWord } from '@/types/vocabulary';

export interface NormalizedResult {
  normalized: string;
  tokens: string[];
}

export function normalizeQuery(value: string): NormalizedResult {
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return { normalized, tokens };
}

export interface VocabularyIndexEntry {
  word: VocabularyWord;
  normalizedKey: string;
  tokenKeys: string[];
}

let cachedIndex: VocabularyIndexEntry[] | null = null;

export function getVocabularyIndex(): VocabularyIndexEntry[] {
  if (cachedIndex) return cachedIndex;
  const words: WordEntry[] = loadAllWords();
  cachedIndex = words.map((w) => {
    const { normalized, tokens } = normalizeQuery(w.word);
    return { word: w, normalizedKey: normalized, tokenKeys: tokens };
    
  });
  return cachedIndex;
}

