import type { VocabularyWord } from '@/types/vocabulary';
import { getVocabularyIndex, normalizeQuery } from './vocabularyIndex';

interface RankedResult {
  word: VocabularyWord;
  score: number;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

const MAX_RESULTS = 20;

export function vocabularySearch(query: string, limit = MAX_RESULTS): VocabularyWord[] {
  const { normalized, tokens } = normalizeQuery(query);
  if (!normalized) return [];

  const index = getVocabularyIndex();
  const results: RankedResult[] = [];

  for (const entry of index) {
    let score = 0;
    if (entry.normalizedKey === normalized) {
      score = 100;
    } else if (entry.normalizedKey.startsWith(normalized)) {
      score = 80;
    } else if (entry.tokenKeys.includes(normalized)) {
      score = 65;
    } else if (tokens.length > 1 && tokens.every(t => entry.tokenKeys.includes(t))) {
      score = 50;
    } else {
      const distance = levenshtein(normalized, entry.normalizedKey);
      const threshold = Math.max(1, Math.floor(normalized.length * 0.4));
      if (distance <= threshold) {
        score = 30;
      }
    }

    if (score > 0) {
      results.push({ word: entry.word, score });
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const freqA = Number(a.word.count) || 0;
    const freqB = Number(b.word.count) || 0;
    if (freqB !== freqA) return freqB - freqA;
    return a.word.word.localeCompare(b.word.word);
  });

  if (results.length > limit) {
    const exactIndex = results.findIndex(r => r.score === 100);
    if (exactIndex >= 0 && exactIndex >= limit) {
      const [exact] = results.splice(exactIndex, 1);
      return [exact, ...results.slice(0, limit - 1)].map(r => r.word);
    }
    return results.slice(0, limit).map(r => r.word);
  }

  return results.map(r => r.word);
}

