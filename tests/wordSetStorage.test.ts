/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SET_ID } from '@/lib/wordSets/constants';
import {
  buildStudyList,
  deleteWordSet,
  getActiveSetId,
  listStoredSets,
  recordWordEvent,
  renameWordSet,
  saveImportedSet,
  summarizeSet,
} from '@/lib/wordSets/repository';

const sampleData = {
  travel: [
    { word: 'embark', meaning: 'begin a journey', example: 'They embark at dawn.', count: 0, category: 'travel' },
    { word: 'jet lag', meaning: 'tired after flying', example: 'Jet lag hit hard.', count: 0, category: 'travel' },
  ],
};

describe('word set storage and progress', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps the Default set and refuses to delete it', () => {
    const sets = listStoredSets();
    expect(sets[0].id).toBe(DEFAULT_SET_ID);
    expect(sets[0].name).toBe('Default');
    expect(() => deleteWordSet(DEFAULT_SET_ID)).toThrow(/cannot be deleted/);
    expect(listStoredSets().some((set) => set.id === DEFAULT_SET_ID)).toBe(true);
  });

  it('imports, renames, activates, and deletes a set', () => {
    const created = saveImportedSet({
      name: 'Travel',
      source: 'csv',
      fileName: 'travel.csv',
      data: sampleData,
      wordCount: 2,
    });

    expect(getActiveSetId()).toBe(created.id);
    expect(listStoredSets().map((set) => set.name)).toContain('Travel');

    renameWordSet(created.id, 'Trips');
    expect(listStoredSets().find((set) => set.id === created.id)?.name).toBe('Trips');
    expect(() => renameWordSet(DEFAULT_SET_ID, 'Other')).toThrow(/Default set/);

    deleteWordSet(created.id);
    expect(listStoredSets().some((set) => set.id === created.id)).toBe(false);
    expect(getActiveSetId()).toBe(DEFAULT_SET_ID);
  });

  it('tracks learning progress separately for each set', () => {
    const trips = saveImportedSet({
      name: 'Trips',
      source: 'json',
      data: sampleData,
      wordCount: 2,
      activate: false,
    });
    const kitchen = saveImportedSet({
      name: 'Kitchen',
      source: 'xlsx',
      data: {
        food: [{ word: 'simmer', meaning: 'cook gently', example: 'Simmer the soup.', count: 0 }],
      },
      wordCount: 1,
      activate: false,
    });

    recordWordEvent(trips.id, 'embark', 'learned');
    recordWordEvent(trips.id, 'jet lag', 'seen');

    const tripStats = summarizeSet(trips.id, sampleData.travel);
    expect(tripStats.learned).toBe(1);
    expect(tripStats.learning).toBe(1);
    expect(summarizeSet(kitchen.id, [{ word: 'simmer' }])).toMatchObject({
      learned: 0,
      learning: 0,
    });

    const queue = buildStudyList(trips.id, sampleData.travel, 10);
    expect(queue.map((word) => word.word)).toEqual(['jet lag']);

    recordWordEvent(trips.id, 'embark', 'reset');
    expect(buildStudyList(trips.id, sampleData.travel, 10).map((word) => word.word)).toEqual([
      'embark',
      'jet lag',
    ]);
  });
});
