/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useVocabularyDataLoader } from '@/hooks/vocabulary-controller/core/useVocabularyDataLoader';
import { VocabularyWord } from '@/types/vocabulary';

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('useVocabularyDataLoader initialWords index handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wordsA: VocabularyWord[] = [
    { word: 'a', meaning: '', example: '', category: 'c', count: 1 },
    { word: 'b', meaning: '', example: '', category: 'c', count: 1 },
    { word: 'c', meaning: '', example: '', category: 'c', count: 1 }
  ];

  it('keeps current word if still present', () => {
    let storedList: VocabularyWord[] = wordsA;
    const setWordList = vi.fn((update: any) => {
      storedList = typeof update === 'function' ? update(storedList) : update;
    });
    const setHasData = vi.fn();
    let indexProp = 0;
    const setCurrentIndex = vi.fn((i: number) => {
      indexProp = i;
    });

    const { rerender } = renderHook(({ words }: { words: VocabularyWord[] }) =>
      useVocabularyDataLoader(
        setWordList,
        setHasData,
        setCurrentIndex,
        indexProp,
        'v',
        vi.fn(),
        words
      ),
      { initialProps: { words: wordsA } }
    );

    // simulate moving to index 1
    indexProp = 1;
    rerender({ words: wordsA });
    setCurrentIndex.mockClear();
    setWordList.mockClear();

    const updated: VocabularyWord[] = [
      { word: 'b', meaning: '', example: '', category: 'c', count: 1 },
      { word: 'c', meaning: '', example: '', category: 'c', count: 1 },
      { word: 'd', meaning: '', example: '', category: 'c', count: 1 }
    ];

    rerender({ words: updated });

    expect(setCurrentIndex).toHaveBeenCalledWith(0);
    expect(setWordList).toHaveBeenCalled();
    expect(storedList).toEqual(updated);
    expect(setHasData).toHaveBeenCalledWith(true);
  });

  it('advances when current word removed', () => {
    let storedList: VocabularyWord[] = wordsA;
    const setWordList = vi.fn((update: any) => {
      storedList = typeof update === 'function' ? update(storedList) : update;
    });
    const setHasData = vi.fn();
    let indexProp = 0;
    const setCurrentIndex = vi.fn((i: number) => {
      indexProp = i;
    });

    const { rerender } = renderHook(({ words }: { words: VocabularyWord[] }) =>
      useVocabularyDataLoader(
        setWordList,
        setHasData,
        setCurrentIndex,
        indexProp,
        'v',
        vi.fn(),
        words
      ),
      { initialProps: { words: wordsA } }
    );

    // simulate moving to index 1 (word 'b')
    indexProp = 1;
    rerender({ words: wordsA });
    setCurrentIndex.mockClear();
    setWordList.mockClear();

    const updated: VocabularyWord[] = [
      { word: 'a', meaning: '', example: '', category: 'c', count: 1 },
      { word: 'c', meaning: '', example: '', category: 'c', count: 1 }
    ];

    rerender({ words: updated });

    expect(setCurrentIndex).toHaveBeenCalledWith(1);
    expect(setWordList).toHaveBeenCalled();
    expect(storedList).toEqual(updated);
    expect(setHasData).toHaveBeenCalledWith(true);
  });
});
