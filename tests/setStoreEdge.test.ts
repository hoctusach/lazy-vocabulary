/**
 * @vitest-environment jsdom
 * Word set storage edge cases (E16, E19, E21-E23).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildTodayQueue,
  emptyProgress,
  getSetProgress,
  getSetSheets,
  importVocabularySet,
  listVocabularySets,
  markSetWordLearned,
  markSetWordNew,
  progressStatsFor,
  wordKey,
} from '@/features/word-sets/vocabularySetStore';
import type { VocabularyWord } from '@/types/vocabulary';

const word = (w: string, category = 'imported'): VocabularyWord => ({ word: w, meaning: 'm', example: '', count: 0, category });
const sheetsOf = (...words: VocabularyWord[]) => ({ imported: words });
const NOW = new Date('2026-03-10T10:00:00');

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('storage failures (E16, E22)', () => {
  it('reports a full storage and leaves no half-made set', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    const result = importVocabularySet('Big', sheetsOf(word('a')));
    expect(result.ok).toBe(false);
    vi.restoreAllMocks();
    expect(listVocabularySets()).toHaveLength(1);
  });

  it('ignores a corrupt set list and falls back to the Default set only', () => {
    localStorage.setItem('lv.vocabularySets.v1', '{bad json');
    expect(listVocabularySets().map((s) => s.id)).toEqual(['default']);
  });

  it('returns empty data for a set whose words are corrupt', () => {
    const result = importVocabularySet('A', sheetsOf(word('a')));
    if (!result.ok) throw new Error('import failed');
    localStorage.setItem(`lv.vocabularySets.data.${result.set.id}`, '{bad');
    expect(getSetSheets(result.set.id)).toEqual({});
  });

  it('returns empty progress for a set whose progress is corrupt', () => {
    const result = importVocabularySet('A', sheetsOf(word('a')));
    if (!result.ok) throw new Error('import failed');
    localStorage.setItem(`lv.vocabularySets.progress.${result.set.id}`, '[1,2');
    expect(getSetProgress(result.set.id).learned).toEqual({});
  });
});

describe('names (E19)', () => {
  it('currently allows two sets with the same name (decide if this is wanted)', () => {
    importVocabularySet('Same', sheetsOf(word('a')));
    importVocabularySet('Same', sheetsOf(word('b')));
    expect(listVocabularySets().filter((s) => s.name === 'Same')).toHaveLength(2);
  });

  it('trims, shortens to 60 characters and has a fallback name', () => {
    const a = importVocabularySet(`  ${'x'.repeat(80)}  `, sheetsOf(word('a')));
    const b = importVocabularySet('   ', sheetsOf(word('b')));
    expect(a.ok && a.set.name).toHaveLength(60);
    expect(b.ok && b.set.name).toBe('Imported set');
  });

  it('rejects a set without words', () => {
    expect(importVocabularySet('Empty', {}).ok).toBe(false);
    expect(importVocabularySet('Empty', { imported: [] }).ok).toBe(false);
  });
});

describe('review intervals of a custom set (E23)', () => {
  it('moves the next review 1, 3, 7, 14, then 30 days out', () => {
    const result = importVocabularySet('A', sheetsOf(word('a')));
    if (!result.ok) throw new Error('import failed');
    const id = result.set.id;
    const key = wordKey('a', 'imported');
    const days: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      const state = markSetWordLearned(id, word('a'))!;
      days.push(Math.round((Date.parse(state.learned[key].nextReviewAt) - NOW.getTime()) / 86_400_000));
    }
    expect(days).toEqual([1, 3, 7, 14, 30, 30, 30]);
    expect(getSetProgress(id).learned[key].reviewCount).toBe(7);
  });

  it('marking a word as new again removes it and forgets today list', () => {
    const result = importVocabularySet('A', sheetsOf(word('a'), word('b')));
    if (!result.ok) throw new Error('import failed');
    markSetWordLearned(result.set.id, word('a'));
    const state = markSetWordNew(result.set.id, 'a', 'imported')!;
    expect(state.learned).toEqual({});
    expect(state.todayKeys).toBeUndefined();
  });

  it('never changes the Default set', () => {
    expect(markSetWordLearned('default', word('a'))).toBeNull();
    expect(markSetWordNew('default', 'a')).toBeNull();
  });
});

describe('today queue (E21)', () => {
  const words = (n: number, prefix = 'w') => Array.from({ length: n }, (_, i) => word(`${prefix}${i}`));
  const learnedDue = (list: VocabularyWord[]) => {
    const progress = emptyProgress();
    for (const w of list) {
      progress.learned[wordKey(w.word, w.category)] = {
        word: w.word,
        category: w.category ?? '',
        reviewCount: 1,
        learnedAt: '2026-03-01T00:00:00.000Z',
        lastReviewAt: '2026-03-01T00:00:00.000Z',
        nextReviewAt: '2026-03-09T00:00:00.000Z',
      };
    }
    return progress;
  };

  // Daily size of a custom set (FB-35 / FB-51): 20 words in total, due first, then new ones.
  it('takes 20 words from a long list of new words', () => {
    expect(buildTodayQueue(words(50), emptyProgress(), '2026-03-10')).toHaveLength(20);
  });

  it('a short list gives all its words', () => {
    expect(buildTodayQueue(words(7), emptyProgress(), '2026-03-10')).toHaveLength(7);
  });

  it('puts due words first, then fills with new ones up to 20', () => {
    const due = words(5, 'due');
    const queue = buildTodayQueue([...words(30), ...due], learnedDue(due), '2026-03-10');
    expect(queue).toHaveLength(20);
    expect(queue.slice(0, 5).map((w) => w.word)).toEqual(due.map((w) => w.word));
  });

  it('shows only due words when there are 25 of them (20 in total)', () => {
    const due = words(25, 'due');
    const queue = buildTodayQueue([...words(10), ...due], learnedDue(due), '2026-03-10');
    expect(queue).toHaveLength(20);
    expect(queue.every((w) => w.word.startsWith('due'))).toBe(true);
  });

  it('keeps the list of the day first, in the same order, and never repeats a word', () => {
    const list = words(5);
    const progress = { ...emptyProgress(), todayDate: '2026-03-10', todayKeys: [wordKey('w2', 'imported'), wordKey('w0', 'imported')] };
    const queue = buildTodayQueue(list, progress, '2026-03-10').map((w) => w.word);
    expect(queue.slice(0, 2)).toEqual(['w2', 'w0']);
    expect(new Set(queue).size).toBe(queue.length);
  });

  it('a new day builds a fresh list', () => {
    const list = words(5);
    const progress = { ...emptyProgress(), todayDate: '2026-03-10', todayKeys: [wordKey('w2', 'imported')] };
    expect(buildTodayQueue(list, progress, '2026-03-11')).toHaveLength(5);
  });

  it('is empty-safe', () => {
    expect(buildTodayQueue([], emptyProgress(), '2026-03-10')).toEqual([]);
  });

  it('counts learning words once and never below zero', () => {
    const progress = emptyProgress();
    progress.learning = { [wordKey('a', 'imported')]: { word: 'a', category: 'imported', seenAt: '2026-03-10T00:00:00Z' } };
    expect(progressStatsFor(words(0), progress)).toMatchObject({ total: 0, new: 0, learning: 1 });
  });
});
