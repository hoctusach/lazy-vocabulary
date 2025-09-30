/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { getLocalPreferences, saveLocalPreferences } from '@/lib/preferences/localPreferences';

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
    const initialSummary = {
      learning_count: 2,
      learned_count: 5,
      learning_due_count: 1,
      remaining_count: 3,
      learning_time: 0,
      learned_days: [],
      updated_at: null,
    };
    const overrideRows = Array.from({ length: 6 }).map((_, index) => ({
      word: `word-${index}`,
    }));
    const refreshedSummary = {
      learning_count: 4,
      learned_count: 4,
      learning_due_count: 4,
      remaining_count: 10,
      learning_time: 0,
      learned_days: [],
      updated_at: null,
    };

    fetchProgressSummaryMock.mockResolvedValue(initialSummary);
    fetchLearnedWordSummariesMock.mockResolvedValue(overrideRows);

    const { result } = renderHook(() => useLearningProgress([]));

    await act(async () => {
      await result.current.refreshStats('user-key');
    });
    expect(result.current.progressStats).toMatchObject({
      learning: initialSummary.learning_count,
      new: initialSummary.remaining_count,
      due: initialSummary.learning_due_count,
      learned: initialSummary.learned_count,
      total:
        initialSummary.learned_count +
        initialSummary.learning_count +
        initialSummary.remaining_count,
    });

    await act(async () => {
      await result.current.refreshLearnedWords('user-key');
    });
    expect(result.current.progressStats.learned).toBe(overrideRows.length);
    expect(result.current.progressStats.total).toBe(
      overrideRows.length +
        initialSummary.learning_count +
        initialSummary.remaining_count
    );

    fetchProgressSummaryMock.mockResolvedValue(refreshedSummary);

    await act(async () => {
      await result.current.refreshStats('user-key');
    });
    expect(result.current.progressStats.learning).toBe(
      refreshedSummary.learning_count
    );
    expect(result.current.progressStats.new).toBe(refreshedSummary.remaining_count);
    expect(result.current.progressStats.due).toBe(refreshedSummary.learning_due_count);
    expect(result.current.progressStats.learned).toBe(overrideRows.length);
    expect(result.current.progressStats.total).toBe(
      overrideRows.length +
        refreshedSummary.learning_count +
        refreshedSummary.remaining_count
    );
  });
});
