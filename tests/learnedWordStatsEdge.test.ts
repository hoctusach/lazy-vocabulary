import { describe, expect, it } from 'vitest';
import { computeLearnedWordStats, type LearnedWordRow } from '@/lib/progress/learnedWordStats';

const NOW = new Date('2026-03-10T12:00:00.000Z');
const row = (over: Partial<LearnedWordRow>): LearnedWordRow => ({ word_id: 'a::idioms', srs_state: 'learning', ...over }) as LearnedWordRow;
const stats = (rows: LearnedWordRow[], totalWords = 100, timezone: string | null = null) =>
  computeLearnedWordStats(rows, { now: NOW, totalWords, timezone });

describe('empty and odd input (D1)', () => {
  it('handles null, undefined and empty input', () => {
    for (const input of [null, undefined, []] as unknown as LearnedWordRow[][]) {
      const result = stats(input);
      expect(result.summary).toMatchObject({ learned: 0, learning: 0, due: 0, remaining: 100, total: 100 });
      expect(result.learnedWords).toEqual([]);
    }
  });

  it('reads the state ignoring case', () => {
    const result = stats([row({ srs_state: 'LEARNED' }), row({ srs_state: 'Learning', word_id: 'b::idioms' })]);
    expect(result.summary.learned).toBe(1);
    expect(result.summary.learning).toBe(1);
  });

  it('ignores rows with an unknown state', () => {
    const result = stats([row({ srs_state: 'weird' }), row({ srs_state: null })]);
    expect(result.summary.learned + result.summary.learning).toBe(0);
  });
});

describe('new today vs due today (D2)', () => {
  it('uses the server flags when they are present', () => {
    const rows = [
      row({ word_id: 'n::x', is_today_selection: true, due_selected_today: false }),
      row({ word_id: 'd::x', is_today_selection: true, due_selected_today: true }),
      row({ word_id: 'o::x', is_today_selection: false, due_selected_today: true }),
    ];
    const result = stats(rows);
    expect(result.newTodayWords.map((w) => w.word)).toEqual(['n']);
    expect(result.dueTodayWords.map((w) => w.word)).toEqual(['d']);
  });

  it('falls back to dates when the flags are null', () => {
    const rows = [
      row({ word_id: 'due::x', is_today_selection: null, due_selected_today: null, last_review_at: '2026-03-10T01:00:00Z', next_review_at: '2026-03-09T00:00:00Z' }),
      row({ word_id: 'new::x', is_today_selection: null, due_selected_today: null, last_review_at: '2026-03-10T01:00:00Z', next_review_at: '2026-03-20T00:00:00Z' }),
      row({ word_id: 'old::x', is_today_selection: null, due_selected_today: null, last_review_at: '2026-03-01T01:00:00Z', next_review_at: '2026-03-20T00:00:00Z' }),
    ];
    const result = stats(rows);
    expect(result.dueTodayWords.map((w) => w.word)).toEqual(['due']);
    expect(result.newTodayWords.map((w) => w.word)).toEqual(['new']);
  });

  it('counts a learning word as due when its next review is in the past', () => {
    const result = stats([row({ next_review_at: '2026-03-09T00:00:00Z' }), row({ word_id: 'b::x', next_review_at: '2026-04-01T00:00:00Z' })]);
    expect(result.summary.due).toBe(1);
  });

  it('classifies "today" in the given time zone', () => {
    const r = row({ is_today_selection: null, due_selected_today: false, last_review_at: '2026-03-09T20:00:00Z' });
    // 20:00 UTC on the 9th is already the 10th in Ho Chi Minh City (UTC+7), still the 9th in Los Angeles.
    expect(stats([r], 100, 'Asia/Ho_Chi_Minh').newTodayWords).toHaveLength(1);
    expect(stats([r], 100, 'America/Los_Angeles').newTodayWords).toHaveLength(0);
  });
});

describe('counters (D3)', () => {
  it('never goes negative when learned + learning exceed the total', () => {
    const rows = [row({ srs_state: 'learned', word_id: 'a::x' }), row({ srs_state: 'learned', word_id: 'b::x' }), row({ word_id: 'c::x' })];
    const { summary } = stats(rows, 2);
    expect(summary.remaining).toBe(0);
    expect(summary.new).toBeGreaterThanOrEqual(0);
    expect(summary.total).toBe(3); // total follows the rows, not the configured total, when they exceed it
  });

  it('"new" means never seen: the total minus learned and learning words, the same as "remaining"', () => {
    const rows = [row({ srs_state: 'learned', word_id: 'a::x' }), row({ srs_state: 'learning', word_id: 'b::x' })];
    const { summary } = stats(rows, 10);
    expect(summary.new).toBe(8);
    expect(summary.new).toBe(summary.remaining);
  });
});

describe('word id forms (D4)', () => {
  const wordOf = (r: Partial<LearnedWordRow>) => stats([row({ srs_state: 'learned', ...r })]).learnedWords[0];

  it('word::category', () => expect(wordOf({ word_id: 'give up::idioms' })).toMatchObject({ word: 'give up', category: 'idioms' }));
  it('category::word when the category column matches the first part', () =>
    expect(wordOf({ word_id: 'idioms::give up', category: 'idioms' })).toMatchObject({ word: 'give up', category: 'idioms' }));
  it('keeps extra :: inside the category', () => expect(wordOf({ word_id: 'a::b::c' })).toMatchObject({ word: 'a', category: 'b::c' }));
  it('uses the word column when there is no word_id', () => expect(wordOf({ word_id: '', word: 'spare' })).toMatchObject({ word: 'spare' }));
  it('drops a row with neither id nor word', () => {
    expect(stats([row({ srs_state: 'learned', word_id: '', word: '' })]).learnedWords).toEqual([]);
  });
});

describe('learned date fallback (D5)', () => {
  const dateOf = (r: Partial<LearnedWordRow>) => stats([row({ srs_state: 'learned', ...r })]).learnedWords[0].learnedDate;
  it('mark_learned_at first', () =>
    expect(dateOf({ mark_learned_at: '2026-01-01T00:00:00Z', learned_at: '2026-01-02T00:00:00Z' })).toBe('2026-01-01T00:00:00.000Z'));
  it('then learned_at, last_review_at, next_review_at', () => {
    expect(dateOf({ learned_at: '2026-01-02T00:00:00Z', last_review_at: '2026-01-03T00:00:00Z' })).toBe('2026-01-02T00:00:00.000Z');
    expect(dateOf({ last_review_at: '2026-01-03T00:00:00Z', next_review_at: '2026-01-04T00:00:00Z' })).toBe('2026-01-03T00:00:00.000Z');
    expect(dateOf({ next_review_at: '2026-01-04T00:00:00Z' })).toBe('2026-01-04T00:00:00.000Z');
  });
  it('is undefined when nothing is usable (invalid dates are ignored)', () => {
    expect(dateOf({ mark_learned_at: 'not a date', learned_at: '' })).toBeUndefined();
  });
});
