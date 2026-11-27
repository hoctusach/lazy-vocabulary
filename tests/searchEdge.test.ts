import { beforeEach, describe, expect, it } from 'vitest';
import { searchVocabulary } from '@/services/search/vocabularySearch';
import { invalidateVocabularyIndex } from '@/services/search/vocabularyIndex';
import { setAllWordsOverride } from '@/utils/allWords';
import type { VocabularyWord } from '@/types/vocabulary';

const w = (word: string, count: number | string = 0, category = 'topic vocab'): VocabularyWord => ({
  word,
  meaning: `${word} meaning`,
  example: '',
  count,
  category,
});

const use = (...words: VocabularyWord[]) => {
  setAllWordsOverride(words);
  invalidateVocabularyIndex();
};
const names = (q: string, limit?: number) => searchVocabulary(q, limit).map((x) => x.word);

beforeEach(() => {
  use(w('apple'), w('apple pie'), w('green apple'), w('pineapple'), w('give up'), w('give in'), w('break the ice'));
});

describe('ranking (H1)', () => {
  it('exact, then prefix, then whole word, then contains-all-tokens', () => {
    const result = names('apple');
    expect(result[0]).toBe('apple');
    expect(result.indexOf('apple pie')).toBeLessThan(result.indexOf('green apple'));
  });

  it('does not match inside a word (pineapple) unless it is a typo-distance match', () => {
    expect(names('apple')).not.toContain('pineapple');
  });
});

describe('typos (H3)', () => {
  it('finds a single word at edit distance 1', () => {
    expect(names('aple')).toContain('apple');
    expect(names('appel')).not.toContain('apple'); // distance 2 is too far for one word
  });

  it('allows distance 2 for several words', () => {
    expect(names('give op')).toContain('give up');
    expect(names('gve op')).toContain('give up');
  });
});

describe('empty and odd queries (H4)', () => {
  it.each(['', '   ', '!!!', '()', '---'.replace(/-/g, '')])('returns nothing for %j', (q) => {
    expect(names(q)).toEqual([]);
  });

  it('ignores annotations in the query (H8)', () => {
    expect(names('give up (phr v)')).toContain('give up');
  });

  it('is case-insensitive', () => {
    expect(names('GIVE UP')[0]).toBe('give up');
  });
});

describe('ties (H2)', () => {
  it('higher count first, then alphabetical', () => {
    use(w('stand b', 1), w('stand a', 1), w('stand c', 9));
    expect(names('stand')).toEqual(['stand c', 'stand a', 'stand b']);
  });

  it('reads counts given as text', () => {
    use(w('walk b', '5'), w('walk a', '1'));
    expect(names('walk')).toEqual(['walk b', 'walk a']);
  });
});

describe('same word in several categories (H11)', () => {
  it('returns every entry', () => {
    use(w('spare', 0, 'topic vocab'), w('spare', 0, 'idioms'));
    expect(searchVocabulary('spare').map((x) => x.category).sort()).toEqual(['idioms', 'topic vocab']);
  });
});

describe('limit (H7)', () => {
  it('respects a normal limit and always keeps the exact match', () => {
    use(...Array.from({ length: 30 }, (_, i) => w(`apple ${i}`, 100 - i)), w('apple', 0));
    const result = names('apple', 5);
    expect(result).toHaveLength(5);
    expect(result).toContain('apple');
  });

  it('limit 0 or less returns nothing', () => {
    expect(names('apple', 0)).toEqual([]);
    expect(names('apple', -3)).toEqual([]);
  });
});

describe('non-Latin words (H5, H6)', () => {
  it.each([
    ['你好', '你好'],
    ['สวัสดี', 'สวัสดี'],
    ['مرحبا', 'مرحبا'],
    ['привет', 'привет'],
    ['안녕하세요', '안녕하세요'],
  ])('finds the %s word in its own script', (word, query) => {
    use(w(word), w('hello'));
    expect(names(query)).toContain(word);
  });

  it('a query of symbols only still returns nothing', () => {
    use(w('你好'));
    expect(names('？！…')).toEqual([]);
  });

  it('Vietnamese words are matched with or without accents (đ is mapped to d)', () => {
    use(w('đường'), w('con đường'), w('duong'));
    expect(names('duong')).toEqual(expect.arrayContaining(['đường', 'duong']));
    expect(names('đường')).toEqual(expect.arrayContaining(['đường', 'duong']));
    expect(names('ĐƯỜNG')).toContain('đường');
  });
});
