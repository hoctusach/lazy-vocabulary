/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useVocabularyDataLoader } from '@/hooks/vocabulary-controller/core/useVocabularyDataLoader';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { learningProgressService } from '@/services/learningProgressService';

vi.mock('@/services/vocabularyService', () => ({
  vocabularyService: {
    getWordList: vi.fn(),
    getCurrentSheetName: vi.fn(),
    addVocabularyChangeListener: vi.fn(),
    removeVocabularyChangeListener: vi.fn()
  }
}));

vi.mock('@/services/learningProgressService', () => ({
  learningProgressService: {
    getTodaySelection: vi.fn(),
    forceGenerateDailySelection: vi.fn()
  }
}));

vi.mock('@/utils/lastWordStorage', () => ({ getLastWord: vi.fn() }));
vi.mock('@/utils/text/findFuzzyIndex', () => ({ findFuzzyIndex: vi.fn() }));

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('useVocabularyDataLoader nextAllowedTime handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at first due word', () => {
    const words: VocabularyWord[] = [
      { word: 'a', meaning: '', example: '', category: 'c', count: 1 },
      { word: 'b', meaning: '', example: '', category: 'c', count: 1 }
    ];
    vocabularyService.getWordList.mockReturnValue(words);
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
      useVocabularyDataLoader(setWordList, setHasData, setCurrentIndex, 'v', vi.fn())
    );

    expect(setWordList).toHaveBeenCalled();
    expect(setHasData).toHaveBeenCalledWith(true);
    expect(setCurrentIndex).toHaveBeenCalledWith(1);
  });

  it('schedules timer when no words are due', () => {
    const words: VocabularyWord[] = [
      { word: 'a', meaning: '', example: '', category: 'c', count: 1 },
      { word: 'b', meaning: '', example: '', category: 'c', count: 1 }
    ];
    vocabularyService.getWordList.mockReturnValue(words);
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
      useVocabularyDataLoader(setWordList, setHasData, setCurrentIndex, 'v', vi.fn())
    );

    expect(setCurrentIndex).toHaveBeenCalledWith(0);
    expect(setTimeoutSpy).toHaveBeenCalled();
    const delay = setTimeoutSpy.mock.calls[0][1];
    expect(delay).toBe(300000);
  });
});
