import { describe, expect, it } from 'vitest';
import {
  buildMixedQueue,
  dedupeBySource,
  filterByBuiltinGroups,
  interleave,
  interleaveBuiltinGroups,
  planBuiltinSelection,
  tagWords,
} from '@/features/word-sets/mixQueue';
import { BUILTIN_GROUPS } from '@/features/word-sets/vocabularySetStore';
import type { VocabularyWord } from '@/types/vocabulary';

const w = (word: string, category = 'c'): VocabularyWord => ({ word, meaning: 'm', example: 'e', count: 0, category });

describe('[FB-18] planBuiltinSelection', () => {
  it('six groups -> RPC with NULL, no client filter', () => {
    expect(planBuiltinSelection(BUILTIN_GROUPS)).toEqual({ call: true, category: null, filterGroups: null });
  });
  it('one group -> that group as p_category', () => {
    expect(planBuiltinSelection(['idioms'])).toEqual({ call: true, category: 'idioms', filterGroups: null });
  });
  it('2-5 groups -> NULL + client-side filter', () => {
    expect(planBuiltinSelection(['idioms', 'grammar'])).toEqual({
      call: true,
      category: null,
      filterGroups: ['grammar', 'idioms'].sort((a, b) => BUILTIN_GROUPS.indexOf(a) - BUILTIN_GROUPS.indexOf(b)),
    });
    expect(planBuiltinSelection(BUILTIN_GROUPS.slice(0, 5)).filterGroups).toHaveLength(5);
  });
  it('no group -> no RPC call', () => {
    expect(planBuiltinSelection([])).toEqual({ call: false, category: null, filterGroups: null });
  });
});

describe('[FB-18] interleave / dedupe / mixed queue', () => {
  it('round-robins and skips exhausted lists', () => {
    expect(interleave([['a1', 'a2', 'a3'], ['b1'], ['c1', 'c2']])).toEqual(['a1', 'b1', 'c1', 'a2', 'c2', 'a3']);
    expect(interleave([[], []])).toEqual([]);
  });

  it('tags every item with its source and mixes sources', () => {
    const queue = buildMixedQueue([
      { sourceId: 'default', words: [w('x1', 'idioms'), w('x2', 'idioms')] },
      { sourceId: 'set_a', words: [w('y1'), w('y2')] },
    ]);
    expect(queue.map((q) => `${q.sourceId}:${q.word}`)).toEqual(['default:x1', 'set_a:y1', 'default:x2', 'set_a:y2']);
  });

  it('de-duplicates by (word, category, source) but keeps the same word from another source', () => {
    const queue = buildMixedQueue([
      { sourceId: 'default', words: [w('dup', 'idioms'), w('dup', 'idioms'), w('dup', 'grammar')] },
      { sourceId: 'set_a', words: [w('dup', 'idioms')] },
    ]);
    expect(queue.map((q) => [q.sourceId, q.category])).toEqual([
      ['default', 'idioms'],
      ['set_a', 'idioms'],
      ['default', 'grammar'],
    ]);
    expect(dedupeBySource(tagWords([w('a'), w('a')], 's'))).toHaveLength(1);
  });

  it('filters built-in words by group, tolerating the singular server spelling', () => {
    const words = [w('a', 'idioms'), w('b', 'phrases, collocation'), w('c', 'grammar')];
    expect(filterByBuiltinGroups(words, ['idioms', 'phrases, collocations']).map((x) => x.word)).toEqual(['a', 'b']);
  });

  it('mixes local built-in groups one by one', () => {
    const out = interleaveBuiltinGroups({ idioms: [w('i1', ''), w('i2', '')], grammar: [w('g1', '')] }, ['idioms', 'grammar']);
    expect(out.map((x) => x.word)).toEqual(['i1', 'g1', 'i2']);
    expect(out[0].category).toBe('idioms');
  });
});
