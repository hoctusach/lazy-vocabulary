/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SET_ID } from '@/features/word-sets/types';
import {
  buildTodayQueue,
  deleteVocabularySet,
  findSetWord,
  getActiveSetId,
  getSetProgress,
  ensureTodayQueue,
  flattenSheets,
  importVocabularySet,
  listVocabularySets,
  markSetWordLearned,
  progressStatsFor,
  recordDisplayedWord,
  renameVocabularySet,
  setActiveSet,
  wordKey,
} from '@/features/word-sets/vocabularySetStore';
import type { VocabularyWord } from '@/types/vocabulary';

const sheets = {
  imported: [
    { word: 'alpha', meaning: 'first', example: 'Alpha is first.', count: 0, category: 'imported' },
    { word: 'beta', meaning: 'second', example: 'Beta is second.', count: 0, category: 'imported' },
  ] satisfies VocabularyWord[],
};

describe('vocabulary set store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps Default, and refuses to delete or rename it', () => {
    expect(listVocabularySets()[0]?.id).toBe(DEFAULT_SET_ID);
    expect(deleteVocabularySet(DEFAULT_SET_ID)).toEqual({
      ok: false,
      error: 'The Default set cannot be deleted.',
    });
    expect(renameVocabularySet(DEFAULT_SET_ID, 'Other')).toEqual({
      ok: false,
      error: 'The Default set cannot be renamed.',
    });
    expect(listVocabularySets().some((set) => set.id === DEFAULT_SET_ID)).toBe(true);
  });

  it('imports a set, switches to it, renames it, and tracks progress separately from Default', () => {
    const imported = importVocabularySet('Travel', sheets, 'travel.csv');
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    expect(getActiveSetId()).toBe(imported.set.id);
    expect(getSetProgress(DEFAULT_SET_ID).learned).toEqual({});

    markSetWordLearned(imported.set.id, sheets.imported[0]);
    const progress = getSetProgress(imported.set.id);
    expect(progress.learned[wordKey('alpha', 'imported')]?.reviewCount).toBe(1);
    expect(getSetProgress(DEFAULT_SET_ID).learned).toEqual({});

    const other = importVocabularySet('Food', {
      imported: [{ word: 'bread', meaning: 'food', example: 'Fresh bread.', count: 0, category: 'imported' }],
    });
    expect(other.ok).toBe(true);
    if (!other.ok) return;
    expect(getSetProgress(other.set.id).learned).toEqual({});
    expect(getSetProgress(imported.set.id).learned[wordKey('alpha', 'imported')]).toBeTruthy();

    expect(renameVocabularySet(imported.set.id, 'Travel notes').ok).toBe(true);
    expect(listVocabularySets().find((set) => set.id === imported.set.id)?.name).toBe('Travel notes');

    expect(deleteVocabularySet(imported.set.id).ok).toBe(true);
    expect(listVocabularySets().some((set) => set.id === imported.set.id)).toBe(false);
    expect(getSetProgress(imported.set.id).learned).toEqual({});
  });

  it('returns to Default when the active imported set is deleted', () => {
    const imported = importVocabularySet('Temp', sheets);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(deleteVocabularySet(imported.set.id).ok).toBe(true);
    expect(getActiveSetId()).toBe(DEFAULT_SET_ID);
  });

  it('builds a stable today queue and does not mix words from another set', () => {
    const travel = sheets.imported;
    const food: VocabularyWord[] = [
      { word: 'bread', meaning: 'food', example: 'Fresh bread.', count: 0, category: 'imported' },
    ];
    const today = '2026-11-12';
    const first = buildTodayQueue(travel, { learned: {} }, today);
    const again = buildTodayQueue(travel, { learned: {}, todayDate: today, todayKeys: first.map((word) => wordKey(word.word, word.category)) }, today);
    expect(again.map((word) => word.word)).toEqual(first.map((word) => word.word));
    expect(buildTodayQueue(food, { learned: {} }, today).map((word) => word.word)).toEqual(['bread']);
    expect(setActiveSet('missing').ok).toBe(false);
  });

  it('records progress for the matching category when the spelling is shared', () => {
    const words: VocabularyWord[] = [
      { word: 'set', meaning: 'to place', example: 'Set the book down.', count: 0, category: 'topic vocab' },
      { word: 'set', meaning: 'a group', example: 'A set of keys.', count: 0, category: 'idioms' },
    ];
    const imported = importVocabularySet('Homonyms', { imported: words });
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const match = findSetWord(words, 'set', 'idioms');
    expect(match?.meaning).toBe('a group');
    markSetWordLearned(imported.set.id, match ?? words[1]);

    const progress = getSetProgress(imported.set.id);
    expect(progress.learned[wordKey('set', 'idioms')]?.reviewCount).toBe(1);
    expect(progress.learned[wordKey('set', 'topic vocab')]).toBeUndefined();
    expect(findSetWord(words, 'set')).toMatchObject({ category: 'topic vocab' });
  });

  it('counts each displayed card as learning without changing the study list', () => {
    const imported = importVocabularySet('Travel', sheets);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const words = flattenSheets(sheets);
    const queue = ensureTodayQueue(imported.set.id, words, '2026-11-12');
    const queueKeys = [...(getSetProgress(imported.set.id).todayKeys ?? [])];
    expect(queue.map((word) => word.word)).toEqual(['alpha', 'beta']);

    expect(recordDisplayedWord(queue[0].word, queue[0].category)).toBe(true);
    expect(recordDisplayedWord(queue[0].word, queue[0].category)).toBe(false);
    let stats = progressStatsFor(words, getSetProgress(imported.set.id));
    expect(stats.learning).toBe(1);
    expect(stats.learned).toBe(0);
    expect(getSetProgress(imported.set.id).todayKeys).toEqual(queueKeys);

    expect(recordDisplayedWord(queue[1].word, queue[1].category)).toBe(true);
    stats = progressStatsFor(words, getSetProgress(imported.set.id));
    expect(stats.learning).toBe(2);
    expect(ensureTodayQueue(imported.set.id, words, '2026-11-12').map((word) => word.word)).toEqual([
      'alpha',
      'beta',
    ]);

    markSetWordLearned(imported.set.id, queue[0]);
    stats = progressStatsFor(words, getSetProgress(imported.set.id));
    expect(stats.learned).toBe(1);
    expect(stats.learning).toBe(1);

    setActiveSet(DEFAULT_SET_ID);
    expect(recordDisplayedWord('alpha', 'imported')).toBe(false);
    expect(getSetProgress(DEFAULT_SET_ID).learning).toEqual({});
  });
});
