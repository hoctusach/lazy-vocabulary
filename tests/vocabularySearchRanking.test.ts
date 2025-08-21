import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VocabularyWord } from '@/types/vocabulary';

vi.mock('@/utils/allWords', () => ({
  loadAllWords: (): VocabularyWord[] => [
    { word: 'end', meaning: '', example: '', count: 5 },
    { word: 'end up', meaning: '', example: '', count: 3 },
    { word: 'make up', meaning: '', example: '', count: 1 },
    { word: 'makeup', meaning: '', example: '', count: 2 }
  ]
}));

import { loadVocabularyIndex, searchVocabulary } from '@/services/search/vocabularySearch';

describe('vocabulary search ranking', () => {
  beforeAll(() => {
    loadVocabularyIndex();
  });

  it('returns exact match first for "end up"', () => {
    const results = searchVocabulary('end up');
    expect(results[0]?.word).toBe('end up');
  });

  it('prioritizes exact "end" over "end up" for query "end"', () => {
    const results = searchVocabulary('end');
    expect(results[0]?.word).toBe('end');
    const words = results.map(r => r.word);
    expect(words).toContain('end up');
  });

  it('ranks "makeup" before fuzzy "make up"', () => {
    const results = searchVocabulary('makeup');
    expect(results[0]?.word).toBe('makeup');
    const words = results.map(r => r.word);
    expect(words.indexOf('make up')).toBeGreaterThan(0);
  });
});
