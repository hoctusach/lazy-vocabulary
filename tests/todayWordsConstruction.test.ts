import { describe, it, expect } from 'vitest';
import { buildTodaysWords } from '@/utils/todayWords';
import type { TodayWord } from '@/types/vocabulary';

const mk = (word: string, category: string, is_due: boolean): TodayWord => ({
  word_id: word,
  word,
  meaning: 'm',
  example: 'e',
  count: 1,
  category,
  is_due,
});

describe('buildTodaysWords', () => {
  const words = [mk('b', 'cat2', false), mk('c', 'cat1', true), mk('a', 'cat1', false)];

  it('returns every word for ALL', () => {
    expect(buildTodaysWords(words, 'ALL').map(w => w.word).sort()).toEqual(['a', 'b', 'c']);
  });

  it('filters by category when provided', () => {
    expect(buildTodaysWords(words, 'cat1').map(w => w.word).sort()).toEqual(['a', 'c']);
  });

  it('puts due words first, then sorts alphabetically', () => {
    expect(buildTodaysWords(words, 'ALL').map(w => w.word)).toEqual(['c', 'a', 'b']);
  });

  it('does not mutate the input array', () => {
    const copy = [...words];
    buildTodaysWords(words, 'ALL');
    expect(words).toEqual(copy);
  });
});
