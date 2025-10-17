import { describe, it, expect } from 'vitest';
import {
  computeLearnedWordStats,
  type LearnedWordRow,
} from '@/lib/progress/learnedWordStats';

function createRow(overrides: Partial<LearnedWordRow> = {}): LearnedWordRow {
  return {
    word_id: 'word::category',
    srs_state: 'learning',
    learned_at: null,
    mark_learned_at: null,
    last_review_at: null,
    next_review_at: null,
    next_display_at: null,
    in_review_queue: null,
    review_count: null,
    srs_interval_days: null,
    srs_ease: null,
    is_today_selection: null,
    due_selected_today: null,
    ...overrides,
  };
}

describe('computeLearnedWordStats', () => {
  it('derives learning, due, new and remaining counts from learning rows and total words', () => {
    const now = new Date('2024-03-10T12:00:00Z');
    const rows: LearnedWordRow[] = [
      createRow({
        word_id: 'learned::core',
        srs_state: 'learned',
        learned_at: '2024-03-01T00:00:00Z',
      }),
      createRow({
        word_id: 'due::core',
        next_review_at: '2024-03-09T00:00:00Z',
      }),
      createRow({
        word_id: 'due-today::core',
        next_review_at: '2024-03-10T00:00:00Z',
      }),
      createRow({
        word_id: 'not-due::core',
        next_review_at: '2024-03-11T00:00:00Z',
        next_display_at: '2024-03-05T00:00:00Z',
      }),
    ];

    const { summary } = computeLearnedWordStats(rows, {
      now,
      totalWords: 10,
    });

    expect(summary.learning).toBe(3);
    expect(summary.due).toBe(2);
    expect(summary.new).toBe(7);
    expect(summary.remaining).toBe(6);
  });

  it('floors new and remaining counts at zero when totals are smaller than progress', () => {
    const now = new Date('2024-03-10T12:00:00Z');
    const rows: LearnedWordRow[] = [
      createRow({
        word_id: 'learned::core',
        srs_state: 'learned',
      }),
      createRow({
        word_id: 'learning::core',
        next_review_at: '2024-03-09T00:00:00Z',
      }),
    ];

    const { summary } = computeLearnedWordStats(rows, {
      now,
      totalWords: 1,
    });

    expect(summary.learning).toBe(1);
    expect(summary.due).toBe(1);
    expect(summary.new).toBe(0);
    expect(summary.remaining).toBe(0);
  });

  it('excludes learned rows from today selections', () => {
    const now = new Date('2024-03-10T12:00:00Z');
    const rows: LearnedWordRow[] = [
      createRow({
        word_id: 'learned-today::core',
        srs_state: 'learned',
        is_today_selection: true,
        due_selected_today: false,
      }),
      createRow({
        word_id: 'learning-new::core',
        is_today_selection: true,
        due_selected_today: false,
      }),
      createRow({
        word_id: 'learning-due::core',
        is_today_selection: true,
        due_selected_today: true,
      }),
    ];

    const { newTodayWords, dueTodayWords } = computeLearnedWordStats(rows, { now, totalWords: 10 });

    expect(newTodayWords).toHaveLength(1);
    expect(newTodayWords[0]?.word).toBe('learning-new');
    expect(dueTodayWords).toHaveLength(1);
    expect(dueTodayWords[0]?.word).toBe('learning-due');
  });
});
