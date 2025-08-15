import type { VocabularyWord } from '@/types/vocabulary';
export type WordEntry = VocabularyWord;

let cachedWords: WordEntry[] | null = null;

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

export async function loadAllWords(): Promise<WordEntry[]> {
  const words = await fetchAllWords();
  console.info(`QuickSearch: loaded ${words.length} words`);
  return words;
}

export { cachedWords as allWords };
