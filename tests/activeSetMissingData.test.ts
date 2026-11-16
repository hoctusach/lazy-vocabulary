/**
 * @vitest-environment jsdom
 * PERSIST-02: an active set whose words are gone must fall back to the built-in set.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SET_ID } from '@/features/word-sets/types';
import { getActiveSetId, importVocabularySet, setActiveSet } from '@/features/word-sets/vocabularySetStore';

const w = (word: string) => ({ word, meaning: 'm', example: '', count: 0, category: 'c' });

describe('getActiveSetId with missing set data', () => {
  beforeEach(() => localStorage.clear());

  const imported = () => {
    const r = importVocabularySet('Mine', { c: [w('a'), w('b')] });
    if (!r.ok) throw new Error(r.error);
    return r.set.id;
  };

  it('keeps an imported set that has words', () => {
    const id = imported();
    expect(getActiveSetId()).toBe(id);
  });

  it('falls back to the built-in set when the data blob was removed', () => {
    const id = imported();
    localStorage.removeItem(`lv.vocabularySets.data.${id}`);
    expect(getActiveSetId()).toBe(DEFAULT_SET_ID);
  });

  it('falls back when the data blob is corrupt or empty', () => {
    const id = imported();
    localStorage.setItem(`lv.vocabularySets.data.${id}`, '{bad');
    expect(getActiveSetId()).toBe(DEFAULT_SET_ID);
    localStorage.setItem(`lv.vocabularySets.data.${id}`, '{}');
    expect(getActiveSetId()).toBe(DEFAULT_SET_ID);
  });

  it('setActiveSet still works for a healthy set', () => {
    const id = imported();
    expect(setActiveSet(DEFAULT_SET_ID)).toEqual({ ok: true });
    expect(setActiveSet(id)).toEqual({ ok: true });
    expect(getActiveSetId()).toBe(id);
  });
});
