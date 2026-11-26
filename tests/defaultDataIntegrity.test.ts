/**
 * @vitest-environment node
 * Checks on the built-in vocabulary file (L1-L5).
 */
import { describe, expect, it, vi } from 'vitest';
import data from '../src/data/defaultVocabulary.json';

vi.mock('@/lib/supabaseClient', () => ({ getSupabaseClient: () => null }));

type Entry = { word: string; meaning: string; example: string; translation?: string; category?: string; count?: number };
const sheets = data as unknown as Record<string, Entry[]>;
const all = Object.entries(sheets).flatMap(([category, words]) => words.map((w) => ({ ...w, sheet: category })));

describe('built-in vocabulary', () => {
  it('has the 6 known categories only (L4)', async () => {
    const { CATEGORY_LABELS } = await import('@/utils/categoryLabels');
    expect(Object.keys(sheets).sort()).toEqual(Object.keys(CATEGORY_LABELS).sort());
  });

  it('has no empty word, meaning or example (L1)', () => {
    const empty = all.filter((w) => !w.word?.trim() || !w.meaning?.trim() || !w.example?.trim());
    expect(empty).toEqual([]);
  });

  it('every entry is stored under its own category', () => {
    expect(all.filter((w) => w.category && w.category !== w.sheet)).toEqual([]);
  });

  // Known issue: the file has 3263 words but the app uses TOTAL_WORDS = 3261 for "remaining" and percentages.
  it.fails('the word total equals TOTAL_WORDS (L2)', async () => {
    const { TOTAL_WORDS } = await import('@/lib/progress/srsSyncByUserKey');
    expect(all.length).toBe(TOTAL_WORDS);
  });

  // Known issue: 193 pairs of word + category are repeated, so they share one progress id (`word::category`).
  it.fails('has no repeated word within a category (L3)', () => {
    const seen = new Map<string, number>();
    for (const w of all) {
      const key = `${w.sheet}::${w.word.trim().toLowerCase()}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    expect([...seen.entries()].filter(([, n]) => n > 1)).toEqual([]);
  });

  // Known issue: the importer cuts fields at 100 / 500 / 1000 / 500 characters, but the built-in data is longer.
  it.fails('fits the import limits, so exporting and re-importing the set loses nothing (L5)', () => {
    const limits = { word: 100, meaning: 500, example: 1000, translation: 500 } as const;
    const tooLong = all.filter((w) => (Object.keys(limits) as (keyof typeof limits)[]).some((k) => (w[k] ?? '').length > limits[k]));
    expect(tooLong).toEqual([]);
  });
});
