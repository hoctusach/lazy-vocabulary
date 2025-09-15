/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import type { VocabularyWord } from '@/types/vocabulary';
import type { DailySelection } from '@/types/learning';
import { learningProgressService } from '@/services/learningProgressService';
import { getPreferences, savePreferences } from '@/lib/db/preferences';

vi.mock('@/lib/db/preferences', () => ({
  getPreferences: vi.fn().mockResolvedValue({
    favorite_voice: null,
    speech_rate: null,
    is_muted: false,
    is_playing: true,
    daily_option: null
  }),
  savePreferences: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/services/learningProgressService', () => ({
  learningProgressService: {
    getTodaySelection: vi.fn().mockReturnValue(null),
    forceGenerateDailySelection: vi.fn(),
    getProgressStats: vi.fn().mockReturnValue({
      total: 0,
      learning: 0,
      new: 0,
      due: 0,
      learned: 0
    }),
    updateWordProgress: vi.fn(),
    getWordProgress: vi.fn(),
    getLearnedWords: vi.fn().mockReturnValue([]),
    markWordLearned: vi.fn(),
    markWordAsNew: vi.fn()
  }
}));

describe('useLearningProgress daily option default', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to light when daily_option is missing', async () => {
    const words: VocabularyWord[] = [
      { word: 'apple', meaning: '', example: '', category: 'fruit' }
    ];
    const selection: DailySelection = {
      newWords: [],
      reviewWords: [],
      totalCount: 0,
      severity: 'light'
    };
    (learningProgressService.forceGenerateDailySelection as vi.Mock).mockReturnValue(selection);

    renderHook(() => useLearningProgress(words));

    await waitFor(() => {
      expect(getPreferences).toHaveBeenCalled();
      expect(learningProgressService.forceGenerateDailySelection).toHaveBeenCalledWith(words, 'light');
      expect(savePreferences).toHaveBeenCalledWith({ daily_option: 'light' });
    });
  });
});

