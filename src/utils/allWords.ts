import type { VocabularyWord } from '@/types/vocabulary';
import Fuse from 'fuse.js';

export type WordEntry = VocabularyWord;

let cachedWords: WordEntry[] | null = null;
let cachedFuse: Fuse<WordEntry> | null = null;

async function fetchAllWords(): Promise<WordEntry[]> {
  if (cachedWords) return cachedWords;
  const res = await fetch('/defaultVocabulary.json');
  if (!res.ok) {
    throw new Error(`Failed to fetch vocabulary (${res.status})`);
  }
  const data: Record<string, WordEntry[]> = await res.json();
  cachedWords = Object.entries(data).flatMap(([category, words]) =>
    words.map((w) => ({ ...w, category }))
  );
  return cachedWords;
}

export async function loadFuse(): Promise<Fuse<WordEntry>> {
  if (cachedFuse) return cachedFuse;
  const words = await fetchAllWords();
  cachedFuse = new Fuse(words, {
    keys: ['word', 'meaning', 'example'],
    threshold: 0.3,
    includeMatches: true,
  });
  console.info(`QuickSearch: indexed ${words.length} words`);
  return cachedFuse;
}

export { cachedWords as allWords };
