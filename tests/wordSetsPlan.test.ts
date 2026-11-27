/**
 * @vitest-environment jsdom
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SET_ID } from '@/features/word-sets/types';
import {
  deleteVocabularySet,
  getActiveSetId,
  getSetProgress,
  importVocabularySet,
  listVocabularySets,
  markSetWordLearned,
  markSetWordNew,
  progressStatsFor,
  recordDisplayedWord,
  renameVocabularySet,
  setActiveSet,
  localDateKey,
} from '@/features/word-sets/vocabularySetStore';
import type { VocabularyWord } from '@/types/vocabulary';

const word = (w: string, category = 'c'): VocabularyWord => ({ word: w, meaning: 'm', example: '', count: 0, category });

describe('word set store', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  const sheets = { c: [word('a'), word('b')] };
  const importSet = () => {
    const r = importVocabularySet('Mine', sheets);
    if (!r.ok) throw new Error(r.error);
    return r.set.id;
  };

  it('SET-21: rename validation', () => {
    const id = importSet();
    expect(renameVocabularySet(id, '')).toEqual({ ok: false, error: 'Enter a name for this set.' });
    expect(renameVocabularySet(id, '   ')).toEqual({ ok: false, error: 'Enter a name for this set.' });
    expect(renameVocabularySet(id, 'x'.repeat(61))).toEqual({
      ok: false,
      error: 'Set names can be at most 60 characters.',
    });
    expect(renameVocabularySet(id, 'Từ vựng 🚀').ok).toBe(true);
    expect(listVocabularySets().find((s) => s.id === id)?.name).toBe('Từ vựng 🚀');
  });

  it('SET-26: built-in set cannot be renamed or deleted', () => {
    const before = JSON.stringify(listVocabularySets());
    expect(renameVocabularySet(DEFAULT_SET_ID, 'x')).toMatchObject({ ok: false, error: expect.stringMatching(/cannot be renamed\.$/) });
    expect(deleteVocabularySet(DEFAULT_SET_ID)).toMatchObject({ ok: false, error: expect.stringMatching(/cannot be deleted\.$/) });
    expect(JSON.stringify(listVocabularySets())).toBe(before);
  });

  it('LEARN-08: markSetWordNew removes learned/learning and resets the queue; no-op for unlearned; null for built-in', () => {
    const id = importSet();
    markSetWordLearned(id, { word: 'a', category: 'c' });
    recordDisplayedWord('b', 'c');
    const reset = markSetWordNew(id, 'a', 'c')!;
    expect(Object.keys(reset.learned)).toEqual([]);
    expect(reset.todayKeys).toBeUndefined();
    const stillLearning = markSetWordNew(id, 'b', 'c')!;
    expect(stillLearning.learning?.['c::b']).toBeDefined();
    expect(markSetWordNew(DEFAULT_SET_ID, 'a')).toBeNull();
  });

  it('PROG-01: stats formula for 10 words, 3 learned (1 due), 2 learning (1 also learned)', () => {
    const words = Array.from({ length: 10 }, (_, i) => word(`w${i}`));
    const today = localDateKey();
    const future = new Date(Date.now() + 10 * 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const entry = (w: string, nextReviewAt: string) => ({
      word: w, category: 'c', reviewCount: 1, learnedAt: past, lastReviewAt: past, nextReviewAt,
    });
    const progress = {
      learned: { 'c::w0': entry('w0', past), 'c::w1': entry('w1', future), 'c::w2': entry('w2', future) },
      learning: {
        'c::w2': { word: 'w2', category: 'c', seenAt: past },
        'c::w3': { word: 'w3', category: 'c', seenAt: past },
      },
    };
    expect(progressStatsFor(words, progress, today)).toEqual({ total: 10, learned: 3, learning: 1, new: 6, due: 1 });
    const tiny = progressStatsFor([word('w0')], progress, today);
    expect(tiny.new).toBe(0);
  });

  it('PROG-02: review intervals are +1, +3, +7, +14, +30 days and learnedAt stays fixed', () => {
    const id = importSet();
    const expectedDays = [1, 3, 7, 14, 30];
    let firstLearnedAt = '';
    expectedDays.forEach((days, index) => {
      const state = markSetWordLearned(id, { word: 'a', category: 'c' })!;
      const entry = state.learned['c::a'];
      if (index === 0) firstLearnedAt = entry.learnedAt;
      expect(entry.reviewCount).toBe(index + 1);
      expect(entry.learnedAt).toBe(firstLearnedAt);
      const diff = (Date.parse(entry.nextReviewAt) - Date.parse(entry.lastReviewAt)) / 86_400_000;
      expect(Math.round(diff)).toBe(days);
    });
  });

  it('PERSIST-09: a corrupt set list recovers the imported sets that still parse', () => {
    const id = importSet();
    localStorage.setItem('lv.vocabularySets.v1', '{bad');
    const sets = listVocabularySets();
    expect(sets[0].id).toBe(DEFAULT_SET_ID);
    expect(sets.map((s) => s.id)).toContain(id);
    expect(sets.find((s) => s.id === id)?.wordCount).toBe(2);
    // Recovered list is written back so the next read is clean.
    expect(JSON.parse(localStorage.getItem('lv.vocabularySets.v1')!).sets).toHaveLength(1);
  });

  it('PERSIST-09b: wrong-shaped set list and corrupt data blobs do not crash', () => {
    localStorage.setItem('lv.vocabularySets.v1', '{"sets":42}');
    localStorage.setItem('lv.vocabularySets.data.junk', '{bad');
    expect(listVocabularySets().map((s) => s.id)).toEqual([DEFAULT_SET_ID]);
    expect(getSetProgress('junk').learned).toEqual({});
  });

  it('PERSIST-11: setActiveSet and getActiveSetId survive a throwing localStorage', () => {
    const id = importSet();
    const boom = () => { throw new Error('SecurityError'); };
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom);
    let result: ReturnType<typeof setActiveSet> | undefined;
    expect(() => { result = setActiveSet(DEFAULT_SET_ID); }).not.toThrow();
    expect(() => getActiveSetId()).not.toThrow();
    expect(getActiveSetId()).toBe(DEFAULT_SET_ID);
    expect(() => listVocabularySets()).not.toThrow();
    expect(result).toBeDefined();
    expect(id).toBeTruthy();
  });

  it('PERSIST-12: setActiveSet reports a friendly error instead of throwing when the write fails', () => {
    const id = importSet();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    const r = setActiveSet(id);
    expect(r.ok).toBe(false);
  });
});
