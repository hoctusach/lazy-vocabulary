/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useVocabularyDataLoader } from '@/hooks/vocabulary-controller/core/useVocabularyDataLoader';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { learningProgressService } from '@/services/learningProgressService';
import { getTodayLastWord } from '@/utils/lastWordStorage';

vi.mock('@/services/vocabularyService', () => ({
  vocabularyService: {
    getAllWords: vi.fn(),
    getCurrentSheetName: vi.fn(),
    addVocabularyChangeListener: vi.fn(),
    removeVocabularyChangeListener: vi.fn(),
    loadDefaultVocabulary: vi.fn(),
    hasData: vi.fn().mockReturnValue(true)
  }
}));

vi.mock('@/services/learningProgressService', () => ({
  learningProgressService: {
    getTodaySelection: vi.fn(),
    forceGenerateDailySelection: vi.fn()
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
    daily_option: 'light'
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

describe('useVocabularyDataLoader nextAllowedTime handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorageMock.getItem.mockReturnValue(null);
    getTodayLastWordMock.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at first due word', () => {
    const words: VocabularyWord[] = [
      { word: 'a', meaning: '', example: '', category: 'c', count: 1 },
      { word: 'b', meaning: '', example: '', category: 'c', count: 1 }
    ];
    vocabularyService.getAllWords.mockReturnValue(words);
    vocabularyService.getCurrentSheetName.mockReturnValue('c');

    const now = new Date('2024-01-01T10:00:00Z').getTime();
    vi.setSystemTime(now);

    learningProgressService.getTodaySelection.mockReturnValue({
      newWords: [
        { word: 'a', category: 'c', isLearned: false, reviewCount: 0, lastPlayedDate: '', status: 'new', nextReviewDate: '', createdDate: '', nextAllowedTime: new Date(now + 60000).toISOString() },
        { word: 'b', category: 'c', isLearned: false, reviewCount: 0, lastPlayedDate: '', status: 'new', nextReviewDate: '', createdDate: '', nextAllowedTime: new Date(now - 60000).toISOString() }
      ],
      reviewWords: [],
      totalCount: 2,
      severity: 'light'
    });

    const setWordList = vi.fn();
    const setHasData = vi.fn();
    const setCurrentIndex = vi.fn();

    renderHook(() =>
      useVocabularyDataLoader(setWordList, setHasData, setCurrentIndex, 0, 'v', vi.fn())
    );

    expect(setWordList).toHaveBeenCalled();
    expect(setHasData).toHaveBeenCalledWith(true);
    expect(setCurrentIndex).toHaveBeenCalledWith(1);
  });

  it('resumes from saved last word for today', () => {
    const words: VocabularyWord[] = [
      { word: 'a', meaning: '', example: '', category: 'c', count: 1 },
      { word: 'b', meaning: '', example: '', category: 'c', count: 1 }
    ];
    vocabularyService.getAllWords.mockReturnValue(words);
    vocabularyService.getCurrentSheetName.mockReturnValue('c');

    const now = new Date('2024-01-01T10:00:00Z').getTime();
    vi.setSystemTime(now);

    learningProgressService.getTodaySelection.mockReturnValue({
      newWords: [
        { word: 'a', category: 'c', isLearned: false, reviewCount: 0, lastPlayedDate: '', status: 'new', nextReviewDate: '', createdDate: '', nextAllowedTime: new Date(now - 60000).toISOString() },
        { word: 'b', category: 'c', isLearned: false, reviewCount: 0, lastPlayedDate: '', status: 'new', nextReviewDate: '', createdDate: '', nextAllowedTime: new Date(now - 60000).toISOString() }
      ],
      reviewWords: [],
      totalCount: 2,
      severity: 'light'
    });

    getTodayLastWordMock.mockReturnValue({ index: 1, word: 'b', category: 'c', date: '2024-01-01' });

    const setWordList = vi.fn();
    const setHasData = vi.fn();
    const setCurrentIndex = vi.fn();

    renderHook(() =>
      useVocabularyDataLoader(setWordList, setHasData, setCurrentIndex, 0, 'v', vi.fn())
    );

    expect(setCurrentIndex).toHaveBeenCalledWith(1);
  });

  it('schedules timer when no words are due', () => {
    const words: VocabularyWord[] = [
      { word: 'a', meaning: '', example: '', category: 'c', count: 1 },
      { word: 'b', meaning: '', example: '', category: 'c', count: 1 }
    ];
    vocabularyService.getAllWords.mockReturnValue(words);
    vocabularyService.getCurrentSheetName.mockReturnValue('c');

    const now = new Date('2024-01-01T10:00:00Z').getTime();
    vi.setSystemTime(now);

    learningProgressService.getTodaySelection.mockReturnValue({
      newWords: [
        { word: 'a', category: 'c', isLearned: false, reviewCount: 0, lastPlayedDate: '', status: 'new', nextReviewDate: '', createdDate: '', nextAllowedTime: new Date(now + 300000).toISOString() },
        { word: 'b', category: 'c', isLearned: false, reviewCount: 0, lastPlayedDate: '', status: 'new', nextReviewDate: '', createdDate: '', nextAllowedTime: new Date(now + 600000).toISOString() }
      ],
      reviewWords: [],
      totalCount: 2,
      severity: 'light'
    });

    const setWordList = vi.fn();
    const setHasData = vi.fn();
    const setCurrentIndex = vi.fn();

    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

    renderHook(() =>
      useVocabularyDataLoader(setWordList, setHasData, setCurrentIndex, 0, 'v', vi.fn())
    );

    expect(setCurrentIndex).toHaveBeenCalledWith(0);
    expect(setTimeoutSpy).toHaveBeenCalled();
    const delay = setTimeoutSpy.mock.calls[0][1];
    expect(delay).toBe(300000);
  });
});
