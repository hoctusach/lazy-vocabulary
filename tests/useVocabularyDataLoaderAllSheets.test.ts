/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useVocabularyDataLoader } from '@/hooks/vocabulary-controller/core/useVocabularyDataLoader';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { learningProgressService } from '@/services/learningProgressService';
import { getTodayLastWord } from '@/utils/lastWordStorage';
import { getPreferences, savePreferences } from '@/lib/db/preferences';

vi.mock('@/services/vocabularyService', () => ({
  vocabularyService: {
    getAllWords: vi.fn(),
    addVocabularyChangeListener: vi.fn(),
    removeVocabularyChangeListener: vi.fn(),
    loadDefaultVocabulary: vi.fn(),
    hasData: vi.fn().mockReturnValue(false)
  }
}));

vi.mock('@/services/learningProgressService', () => ({
  learningProgressService: {
    getTodaySelection: vi.fn().mockReturnValue(null),
    forceGenerateDailySelection: vi.fn().mockReturnValue(null)
  }
}));

vi.mock('@/utils/lastWordStorage', () => ({ getTodayLastWord: vi.fn() }));
vi.mock('@/utils/text/findFuzzyIndex', () => ({ findFuzzyIndex: vi.fn() }));
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

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

const getTodayLastWordMock = getTodayLastWord as unknown as vi.Mock;

describe('useVocabularyDataLoader all sheets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    getTodayLastWordMock.mockReturnValue(undefined);
  });

  it('generates daily selection from multiple categories on first load', async () => {
    const words: VocabularyWord[] = [
      { word: 'a', meaning: '', example: '', category: 'c1', count: 1 },
      { word: 'b', meaning: '', example: '', category: 'c2', count: 1 }
    ];
    vocabularyService.getAllWords.mockReturnValue(words);
    vocabularyService.loadDefaultVocabulary.mockResolvedValue(true);

    const setWordList = vi.fn();
    const setHasData = vi.fn();
    const setCurrentIndex = vi.fn();

    renderHook(() =>
      useVocabularyDataLoader(setWordList, setHasData, setCurrentIndex, 0, 'v', vi.fn())
    );

    await waitFor(() => {
      expect(vocabularyService.loadDefaultVocabulary).toHaveBeenCalled();
      expect(getPreferences).toHaveBeenCalled();
      expect(savePreferences).toHaveBeenCalledWith({ daily_option: 'light' });
      expect(learningProgressService.forceGenerateDailySelection).toHaveBeenCalledWith(words, 'light');
      expect(setWordList).toHaveBeenCalledWith(words);
    });
  });
});

