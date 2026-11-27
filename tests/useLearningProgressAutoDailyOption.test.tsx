/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import * as service from '@/services/learningProgressService';
import { getLocalPreferences, saveLocalPreferences } from '@/lib/preferences/localPreferences';

vi.mock('@/lib/preferences/localPreferences', () => ({
  getLocalPreferences: vi.fn().mockResolvedValue({
    favorite_voice: null,
    speech_rate: null,
    is_muted: false,
    is_playing: true,
    daily_option: null,
  }),
  saveLocalPreferences: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/progress/srsSyncByUserKey', () => ({
  bootstrapLearnedFromServerByKey: vi.fn().mockResolvedValue(undefined),
  markLearnedServerByKey: vi.fn().mockResolvedValue(null),
  ensureUserKey: vi.fn().mockResolvedValue('user-key'),
  TOTAL_WORDS: 0,
}));

vi.mock('@/services/analyticsService', () => ({
  identifyUser: vi.fn(),
  trackDailySelectionEvent: vi.fn(),
  trackReviewDue: vi.fn(),
  trackWordLearned: vi.fn(),
  trackWordReset: vi.fn(),
}));

vi.mock('@/services/learningProgressService', async () => {
  const actual = await vi.importActual<typeof import('@/services/learningProgressService')>(
    '@/services/learningProgressService'
  );
  return {
    ...actual,
    prepareUserSession: vi.fn().mockResolvedValue('user-key'),
    getOrCreateTodayWords: vi.fn().mockResolvedValue({
      selection: { newWords: [], reviewWords: [], totalCount: 0, severity: 'light' },
      words: [],
      learnedWords: [],
      newTodayWords: [],
      dueTodayWords: [],
      summary: null,
    }),
  };
});

describe('useLearningProgress daily option default', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to light when daily_option is missing', async () => {
    renderHook(() => useLearningProgress());

    await waitFor(() => {
      expect(getLocalPreferences).toHaveBeenCalled();
      expect(saveLocalPreferences).toHaveBeenCalledWith({ daily_option: 'light' });
      expect(service.getOrCreateTodayWords).toHaveBeenCalledWith(
        'user-key',
        service.getModeForSeverity('light'),
        service.getCountForSeverity('light'),
        null
      );
    });
  });
});
