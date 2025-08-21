import type { VocabularyWord } from '@/types/vocabulary';
import { normalizeQuery } from '@/utils/text/normalizeQuery';
import { loadVocabularyIndex, IndexedWord } from './vocabularyIndex';

export { loadVocabularyIndex } from './vocabularyIndex';

const levenshtein = (a: string, b: string): number => {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) matrix[i][j] = matrix[i - 1][j - 1];
      else matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + 1
      );
    }
  }
  return matrix[a.length][b.length];
};

interface ScoredWord {
  entry: IndexedWord;
  rank: number;
}

export const searchVocabulary = (query: string, limit = 20): VocabularyWord[] => {
  const normalized = normalizeQuery(query).toLowerCase();
  if (!normalized) return [];

  const index = loadVocabularyIndex();
  const qTokens = normalized.split(/\s+/).filter(Boolean);

  const scored: ScoredWord[] = [];

  for (const entry of index) {
    const { normalizedKey, tokens } = entry;
    let rank = 0;
    if (normalizedKey === normalized) rank = 100;
    else if (normalizedKey.startsWith(normalized)) rank = 80;
    else if ((` ${normalizedKey} `).includes(` ${normalized} `)) rank = 65;
    else if (qTokens.every(t => tokens.includes(t))) rank = 50;
    else {
      const dist = levenshtein(normalizedKey, normalized);
      const threshold = qTokens.length > 1 ? 2 : 1;
      if (dist <= threshold) rank = 30;
    }
    if (rank > 0) {
      scored.push({ entry, rank });
    }
  }

  scored.sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    if (b.entry.frequency !== a.entry.frequency) return b.entry.frequency - a.entry.frequency;
    return a.entry.word.word.localeCompare(b.entry.word.word);
  });

  const exact = scored.find(s => s.rank === 100);
  const limited = scored.slice(0, limit);
  if (exact && !limited.includes(exact)) {
    limited.pop();
    limited.push(exact);
  }

  return limited.map(s => s.entry.word);
};

export default searchVocabulary;
