/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { computeLearnedWordStats, type LearnedWordRow } from '@/lib/progress/learnedWordStats';

const {
  fetchProgressSummaryMock,
  fetchLearnedWordSummariesMock,
} = vi.hoisted(() => ({
  fetchProgressSummaryMock: vi.fn(),
  fetchLearnedWordSummariesMock: vi.fn(),
}));

vi.mock('@/services/learningProgressService', () => ({
  prepareUserSession: vi.fn().mockResolvedValue(null),
  fetchProgressSummary: fetchProgressSummaryMock,
  fetchLearnedWordSummaries: fetchLearnedWordSummariesMock,
  loadTodayWordsFromLocal: vi.fn(),
  isToday: vi.fn(),
  matchesCurrentOptions: vi.fn(),
  getOrCreateTodayWords: vi.fn(),
  fetchAndCommitTodaySelection: vi.fn(),
  clearTodayWordsInLocal: vi.fn(),
  markWordReviewed: vi.fn(),
  markWordAsNew: vi.fn(),
  getModeForSeverity: vi.fn(),
  getCountForSeverity: vi.fn(),
}));

vi.mock('@/lib/progress/srsSyncByUserKey', () => ({
  bootstrapLearnedFromServerByKey: vi.fn(),
}));

vi.mock('@/lib/preferences/localPreferences', () => ({
  getLocalPreferences: vi.fn().mockResolvedValue({
    favorite_voice: null,
    speech_rate: null,
    is_muted: false,
    is_playing: true,
    daily_option: 'light'
  }),
  saveLocalPreferences: vi.fn().mockResolvedValue(undefined)
}));

describe('useLearningProgress', () => {
  beforeEach(() => {
    fetchProgressSummaryMock.mockReset();
    fetchLearnedWordSummariesMock.mockReset();
  });

  it('keeps learned stat aligned with learned summaries across refreshes', async () => {
    const totalWords = 10;
    const initialSummary = {
      learned: 5,
      learning: 2,
      new: totalWords - 2,
      due: 1,
      remaining: totalWords - 5 - 2,
    };
    const overrideRows = Array.from({ length: 6 }).map((_, index) => ({
      word: `word-${index}`,
    }));
    const learnedSummary = {
      learned: overrideRows.length,
      learning: initialSummary.learning,
      new: totalWords - initialSummary.learning,
      due: initialSummary.due,
      remaining: Math.max(totalWords - overrideRows.length - initialSummary.learning, 0),
    };
    const refreshedSummary = {
      learned: 4,
      learning: 4,
      new: totalWords - 4,
      due: 2,
      remaining: totalWords - 4 - 4,
    };

    fetchProgressSummaryMock.mockResolvedValue(initialSummary);
    fetchLearnedWordSummariesMock.mockResolvedValue({
      learnedWords: overrideRows,
      newTodayWords: [],
      dueTodayWords: [],
      summary: learnedSummary,
    });

    const { result } = renderHook(() => useLearningProgress([]));

    await act(async () => {
      await result.current.refreshStats('user-key');
    });
    expect(result.current.progressStats).toMatchObject({
      learning: initialSummary.learning,
      new: initialSummary.new,
      due: initialSummary.due,
      learned: initialSummary.learned,
      total: totalWords,
    });

    await act(async () => {
      await result.current.refreshLearnedWords('user-key');
    });
    expect(result.current.progressStats.learned).toBe(overrideRows.length);
    expect(result.current.progressStats.total).toBe(totalWords);
    expect(result.current.progressStats.new).toBe(learnedSummary.new);

    fetchProgressSummaryMock.mockResolvedValue(refreshedSummary);

    await act(async () => {
      await result.current.refreshStats('user-key');
    });
    expect(result.current.progressStats.learning).toBe(refreshedSummary.learning);
    expect(result.current.progressStats.new).toBe(refreshedSummary.new);
    expect(result.current.progressStats.due).toBe(refreshedSummary.due);
    expect(result.current.progressStats.learned).toBe(overrideRows.length);
    expect(result.current.progressStats.total).toBe(totalWords);
  });

  it('derives counts from learned word rows when refreshing', async () => {
    const now = new Date('2024-05-10T12:00:00Z');
    const rows: LearnedWordRow[] = [
      {
        word_id: 'alpha::general',
        srs_state: 'learned',
        learned_at: now.toISOString(),
        mark_learned_at: now.toISOString(),
        last_review_at: now.toISOString(),
        next_review_at: now.toISOString(),
        next_display_at: null,
        in_review_queue: true,
        review_count: 3,
        srs_interval_days: 3,
        srs_ease: 2.5,
        is_today_selection: true,
        due_selected_today: false,
      },
      {
        word_id: 'beta::general',
        srs_state: 'learning',
        learned_at: null,
        mark_learned_at: null,
        last_review_at: now.toISOString(),
        next_review_at: new Date('2024-05-08T00:00:00Z').toISOString(),
        next_display_at: null,
        in_review_queue: true,
        review_count: 1,
        srs_interval_days: 1,
        srs_ease: 2.3,
        is_today_selection: true,
        due_selected_today: true,
      },
      {
        word_id: 'gamma::general',
        srs_state: 'learning',
        learned_at: null,
        mark_learned_at: null,
        last_review_at: new Date('2024-05-01T00:00:00Z').toISOString(),
        next_review_at: new Date('2024-05-12T00:00:00Z').toISOString(),
        next_display_at: null,
        in_review_queue: true,
        review_count: 2,
        srs_interval_days: 2,
        srs_ease: 2.2,
        is_today_selection: false,
        due_selected_today: false,
      },
    ];

    const stats = computeLearnedWordStats(rows, { now, totalWords: 50 });

    fetchProgressSummaryMock.mockResolvedValue(stats.summary);
    fetchLearnedWordSummariesMock.mockResolvedValue({
      ...stats,
      summary: stats.summary,
    });

    const { result } = renderHook(() => useLearningProgress([]));

    await act(async () => {
      await result.current.refreshStats('user-key');
    });

    expect(result.current.progressStats).toMatchObject({
      learned: stats.summary.learned,
      learning: stats.summary.learning,
      due: stats.summary.due,
      new: stats.summary.new,
      total: stats.summary.learned + stats.summary.learning + stats.summary.remaining,
    });

    await act(async () => {
      await result.current.refreshLearnedWords('user-key');
    });

    expect(result.current.progressStats).toMatchObject({
      learned: stats.learnedWords.length,
      learning: stats.summary.learning,
      due: stats.summary.due,
      new: stats.summary.new,
      total: stats.summary.learned + stats.summary.learning + stats.summary.remaining,
    });
  });
});
