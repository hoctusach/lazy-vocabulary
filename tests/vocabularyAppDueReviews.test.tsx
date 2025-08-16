/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VocabularyWord } from '@/types/vocabulary';
import VocabularyAppWithLearning from '@/components/VocabularyAppWithLearning';

// make expect available for jest-dom extensions
(globalThis as unknown as { expect: typeof expect }).expect = expect;

const initialWordsSpy = vi.fn();

vi.mock('@/components/vocabulary-app/VocabularyAppContainerNew', () => ({
  default: ({ initialWords }: { initialWords?: VocabularyWord[] }) => {
    initialWordsSpy(initialWords);
    return <div data-testid="container" />;
  }
}));

vi.mock('@/hooks/useLearningProgress', () => ({
  useLearningProgress: () => ({
    dailySelection: { newWords: [], reviewWords: [] },
    progressStats: { total: 0, learned: 0, new: 0, due: 1, learnedCompleted: 0 },
    generateDailyWords: vi.fn(),
    markWordAsPlayed: vi.fn(),
    getDueReviewWords: () => [{ word: 'apple', category: 'fruit', reviewCount: 1 }],
    getLearnedWords: () => [],
    markWordLearned: vi.fn(),
    markWordAsNew: vi.fn(),
    todayWords: [
      { word: 'apple', meaning: '', example: '', category: 'fruit' },
      { word: 'banana', meaning: '', example: '', category: 'fruit' }
    ] as VocabularyWord[]
  })
}));

vi.mock('@/services/vocabularyService', () => ({
  vocabularyService: {
    loadDefaultVocabulary: vi.fn(),
    getAllSheetNames: vi.fn().mockReturnValue([]),
    switchSheet: vi.fn(),
    getWordList: vi.fn().mockReturnValue([]),
    getCurrentWord: vi.fn().mockReturnValue(null),
    addVocabularyChangeListener: vi.fn(),
    removeVocabularyChangeListener: vi.fn()
  }
}));

vi.mock('@/services/learningTimeService', () => ({
  learningTimeService: {
    startSession: vi.fn(),
    stopSession: vi.fn().mockReturnValue(0)
  }
}));

vi.mock('@/utils/streak', () => ({ addStreakDay: vi.fn() }));

beforeEach(async () => {
  await import('@testing-library/jest-dom');
  localStorage.clear();
  initialWordsSpy.mockClear();
});

describe('VocabularyAppWithLearning due reviews', () => {
  it('includes due review words in initial playback without user action', () => {
    render(<VocabularyAppWithLearning />);
    expect(initialWordsSpy).toHaveBeenCalled();
    const words = initialWordsSpy.mock.calls[0][0] as VocabularyWord[];
    expect(words.map(w => w.word)).toContain('apple');
    expect(screen.queryByText('Play Due Reviews')).not.toBeInTheDocument();
  });
});
