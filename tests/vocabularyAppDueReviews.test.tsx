/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VocabularyWord } from '@/types/vocabulary';
import VocabularyAppWithLearning from '@/components/VocabularyAppWithLearning';
import { TooltipProvider } from '@/components/ui/tooltip';

// make expect available for jest-dom extensions
(globalThis as unknown as { expect: typeof expect }).expect = expect;

const initialWordsSpy = vi.fn();

vi.mock('@/components/vocabulary-app/VocabularyAppContainerNew', () => ({
  default: ({
    initialWords,
    additionalContent
  }: {
    initialWords?: VocabularyWord[];
    additionalContent?: React.ReactNode;
  }) => {
    initialWordsSpy(initialWords);
    return (
      <div>
        <div data-testid="container" />
        {additionalContent}
      </div>
    );
  }
}));

vi.mock('@/hooks/useLearningProgress', () => {
  const React = require('react');
  return {
    useLearningProgress: () => {
      const [dailySelection, setDailySelection] = React.useState({
        newWords: [],
        reviewWords: [
          {
            word: 'apple',
            category: 'fruit',
            isLearned: true,
            reviewCount: 1,
            lastPlayedDate: '',
            status: 'due',
            nextReviewDate: '2024-01-01',
            createdDate: ''
          },
          {
            word: 'banana',
            category: 'fruit',
            isLearned: true,
            reviewCount: 1,
            lastPlayedDate: '',
            status: 'due',
            nextReviewDate: '2024-01-02',
            createdDate: ''
          }
        ],
        totalCount: 2,
        severity: 'moderate'
      });

      return {
        dailySelection,
        progressStats: { total: 0, learning: 0, new: 0, due: dailySelection.reviewWords.length, learned: 0 },
        generateDailyWords: vi.fn((severity: string) => {
          if (severity === 'light') {
            setDailySelection(prev => ({
              ...prev,
              reviewWords: prev.reviewWords.slice(0, 1),
              totalCount: prev.newWords.length + 1,
              severity: 'light'
            }));
          }
        }),
        markWordAsPlayed: vi.fn(),
        getLearnedWords: () => [],
        markWordLearned: vi.fn(),
        markWordAsNew: vi.fn(),
        todayWords: [
          { word: 'apple', meaning: '', example: '', category: 'fruit' },
          { word: 'banana', meaning: '', example: '', category: 'fruit' }
        ] as VocabularyWord[]
      };
    }
  };
});

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


beforeEach(async () => {
  await import('@testing-library/jest-dom');
  localStorage.clear();
  initialWordsSpy.mockClear();
});

describe('VocabularyAppWithLearning due reviews', () => {
  it('includes due review words in initial playback without user action', () => {
    render(
      <TooltipProvider>
        <VocabularyAppWithLearning />
      </TooltipProvider>
    );
    expect(initialWordsSpy).toHaveBeenCalled();
    const words = initialWordsSpy.mock.calls[0][0] as VocabularyWord[];
    expect(words.map(w => w.word)).toContain('apple');
    expect(screen.queryByText('Play Due Reviews')).not.toBeInTheDocument();
  });

  it("shrinks due review count and list when lighter intensity is selected", async () => {
    render(
      <TooltipProvider>
        <VocabularyAppWithLearning />
      </TooltipProvider>
    );
    const progressButton = screen.getAllByRole('button', {
      name: /Learning Progress/i
    })[0];
    fireEvent.click(progressButton);
    const summaryButton = screen.getAllByRole('button', {
      name: /Word Summary/i
    })[0];
    fireEvent.click(summaryButton);

    expect(
      screen.getByText("Today's Due Review (2)")
    ).toBeInTheDocument();
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('banana')).toBeInTheDocument();

    const lightButton = screen.getByRole('button', {
      name: /Light \(15-25\)/i
    });
    fireEvent.click(lightButton);

    await waitFor(() =>
      expect(
        screen.getByText("Today's Due Review (1)")
      ).toBeInTheDocument()
    );
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.queryByText('banana')).not.toBeInTheDocument();
  });
});
