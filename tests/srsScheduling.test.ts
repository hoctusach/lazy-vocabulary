/**
 * @vitest-environment node
 * Spaced-repetition rules, tested through markWordReviewed (C1-C8, C25).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/progress/srsSyncByUserKey', () => ({
  ensureUserKey: vi.fn(),
  markLearnedServerByKey: vi.fn().mockResolvedValue(null),
  TOTAL_WORDS: 3263,
}));
vi.mock('@/lib/supabaseClient', () => ({ getSupabaseClient: () => null }));
vi.mock('@/lib/db/supabase', () => ({ getDailySelectionV2: vi.fn() }));

import {
  getCountForSeverity,
  getModeForSeverity,
  markWordReviewed,
  type TodaySelectionState,
} from '@/services/learningProgressService';
import type { TodayWord } from '@/types/vocabulary';
import { MASTER_INTERVAL_DAYS, REVIEW_INTERVALS_DAYS } from '@/lib/progress/reviewSchedule';

const NOW = new Date('2026-03-10T10:00:00.000Z');

const word = (id: string, srs: TodayWord['srs'] = null, category = 'idioms'): TodayWord => ({
  word_id: id,
  word: id.split('::')[0],
  meaning: 'm',
  example: 'e',
  count: 0,
  category,
  is_due: false,
  srs,
});

const state = (words: TodayWord[]): TodaySelectionState => ({
  date: '2026-03-10',
  mode: 'Light',
  count: 20,
  category: null,
  timezone: null,
  words,
  selection: { newWords: [], reviewWords: [], totalCount: words.length, severity: 'light' },
});

const review = (storedReviewCount: number, extra: Partial<NonNullable<TodayWord['srs']>> = {}) =>
  markWordReviewed('user', 'a::idioms', 'light', state([word('a::idioms', { review_count: storedReviewCount, ...extra })]));

const isoDay = (daysFromNow: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + daysFromNow);
  return `${d.toISOString().slice(0, 10)}T00:00:00.000Z`;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe('review schedule (C1, C2)', () => {
  it.each([
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 5],
    [4, 7],
    [5, 10],
    [6, 14],
    [7, 21],
    [8, 28],
    [9, 35],
  ])('review number %i+1 is scheduled %i day(s) later', async (stored, days) => {
    const { payload } = await review(stored);
    expect(payload.review_count).toBe(stored + 1);
    expect(payload.next_review_at).toBe(isoDay(days));
  });

  it('the schedule constants match what the tests below expect', () => {
    expect(REVIEW_INTERVALS_DAYS).toEqual([1, 2, 3, 5, 7, 10, 14, 21, 28, 35]);
    expect(MASTER_INTERVAL_DAYS).toBe(60);
  });

  it('from the 11th review on, the interval is the 60-day master interval', async () => {
    for (const stored of [10, 11, 25]) {
      const { payload } = await review(stored);
      expect(payload.next_review_at).toBe(isoDay(60));
    }
  });
});

describe('status and queue after a review (C3)', () => {
  it('early reviews stay in the review queue as "learning"', async () => {
    const { payload, progress } = await review(0);
    expect(payload.srs_state).toBe('learning');
    expect(payload.in_review_queue).toBe(true);
    expect(progress.reviewCount).toBe(1);
  });

  it('a word in the middle of its schedule is "not_due", not "new"', async () => {
    for (const stored of [0, 1, 4, 9]) {
      const { progress } = await review(stored);
      expect(progress.status).toBe('not_due');
    }
  });

  it('after the 11th review the status is "learned"', async () => {
    const { progress } = await review(10);
    expect(progress.status).toBe('learned');
  });

  it('a word never reviewed stays "new"', async () => {
    const { selection } = await markWordReviewed(
      'user',
      'a::idioms',
      'light',
      state([word('a::idioms'), word('b::idioms')])
    );
    expect(selection.newWords.map((w) => w.status)).toEqual(['new']);
  });

  it('the 11th review marks the word learned and removes it from the queue', async () => {
    const { payload } = await review(10);
    expect(payload.srs_state).toBe('learned');
    expect(payload.in_review_queue).toBe(false);
  });
});

describe('exposure delay before the word may show again (C1)', () => {
  it.each([
    [0, 0],
    [1, 5],
    [2, 7],
    [3, 10],
    [4, 15],
    [5, 30],
    [6, 60],
    [7, 90],
    [8, 120],
    [9, 180],
    [30, 180],
  ])('stored count %i waits %i minutes', async (stored, minutes) => {
    const { payload } = await review(stored);
    expect(Date.parse(payload.next_display_at!)).toBe(NOW.getTime() + minutes * 60_000);
  });
});

describe('payload details', () => {
  it('keeps the first learned_at and the existing ease', async () => {
    const { payload } = await review(2, { learned_at: '2026-01-01T00:00:00.000Z', srs_ease: 2.1 });
    expect(payload.learned_at).toBe('2026-01-01T00:00:00.000Z');
    expect(payload.srs_ease).toBe(2.1);
    expect(payload.last_review_at).toBe(NOW.toISOString());
  });

  it('uses now as learned_at and ease 2.5 for a first review', async () => {
    const { payload } = await review(0);
    expect(payload.learned_at).toBe(NOW.toISOString());
    expect(payload.srs_ease).toBe(2.5);
  });

  it('interval days is never negative', async () => {
    const { payload } = await review(2, { learned_at: '2030-01-01T00:00:00.000Z' });
    expect(payload.srs_interval_days).toBeGreaterThanOrEqual(0);
  });
});

describe('markWordReviewed bookkeeping (C17, C25)', () => {
  it('removes the reviewed word from today and keeps the others', async () => {
    const result = await markWordReviewed(
      'user',
      'a::idioms',
      'light',
      state([word('a::idioms'), word('b::idioms')])
    );
    expect(result.words.map((w) => w.word_id)).toEqual(['b::idioms']);
    expect(result.selection.totalCount).toBe(1);
  });

  it('throws when the word is not in today list', async () => {
    await expect(markWordReviewed('user', 'zzz', 'light', state([word('a::idioms')]))).rejects.toThrow(
      'Word not found in today cache'
    );
  });

  it('does not change the input list', async () => {
    const input = state([word('a::idioms'), word('b::idioms')]);
    await markWordReviewed('user', 'a::idioms', 'light', input);
    expect(input.words).toHaveLength(2);
  });
});

describe('daily size by intensity (C8)', () => {
  it('asks for 25, 50 and 100 words a day', () => {
    expect(getCountForSeverity('light')).toBe(25);
    expect(getCountForSeverity('moderate')).toBe(50);
    expect(getCountForSeverity('intense')).toBe(100);
  });

  it('maps severity to mode', () => {
    expect(getModeForSeverity('light')).toBe('Light');
    expect(getModeForSeverity('moderate')).toBe('Medium');
    expect(getModeForSeverity('intense')).toBe('Hard');
  });
});
