import { describe, expect, it, vi } from 'vitest';
import { markWordReviewed, type TodaySelectionState } from '@/services/learningProgressService';
import type { TodayWord } from '@/types/vocabulary';
import type { DailySelection } from '@/types/learning';

const { markLearnedServerByKeyMock } = vi.hoisted(() => ({
  markLearnedServerByKeyMock: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/progress/srsSyncByUserKey', () => ({
  ensureUserKey: vi.fn(),
  markLearnedServerByKey: markLearnedServerByKeyMock,
  TOTAL_WORDS: 100,
}));

vi.mock('@/lib/progress/learnedWordStats', async () => {
  const actual = await vi.importActual<typeof import('@/lib/progress/learnedWordStats')>(
    '@/lib/progress/learnedWordStats'
  );
  return {
    ...actual,
    computeLearnedWordStats: vi.fn().mockReturnValue({
      learnedWords: [],
      newTodayWords: [],
      dueTodayWords: [],
      summary: null,
    }),
  };
});

describe('markWordReviewed', () => {
  it('removes the learned word from today\'s playlist', async () => {
    const todayWord: TodayWord = {
      word_id: 'alpha::general',
      word: 'alpha',
      meaning: 'meaning',
      example: 'example',
      count: 0,
      category: 'general',
      is_due: true,
      srs: {
        in_review_queue: true,
        review_count: 0,
        learned_at: null,
        last_review_at: null,
        next_review_at: null,
        next_display_at: null,
        last_seen_at: null,
        srs_interval_days: null,
        srs_ease: 2.5,
        srs_state: 'new',
      },
    };

    const selection: DailySelection = {
      newWords: [],
      reviewWords: [],
      totalCount: 1,
      dueCount: 1,
      severity: 'light',
      date: '2024-05-05',
      mode: 'Light',
      count: 1,
      category: 'general',
      timezone: 'UTC',
    };

    const currentState: TodaySelectionState = {
      date: '2024-05-05',
      mode: 'Light',
      count: 1,
      category: 'general',
      timezone: 'UTC',
      words: [todayWord],
      selection,
    };

    markLearnedServerByKeyMock.mockClear();

    const result = await markWordReviewed('user-key', todayWord.word_id, 'light', currentState);

    expect(markLearnedServerByKeyMock).toHaveBeenCalledOnce();
    expect(result.words).toHaveLength(0);
    expect(result.selection.totalCount).toBe(0);
  });
});
