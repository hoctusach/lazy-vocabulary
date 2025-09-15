/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import VocabularyAppWithLearning from '@/components/VocabularyAppWithLearning';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { VocabularyWord } from '@/types/vocabulary';

// make expect available for jest-dom extensions
(globalThis as unknown as { expect: typeof expect }).expect = expect;

vi.mock('@/components/vocabulary-app/VocabularyAppContainerNew', () => ({
  default: ({ additionalContent }: { additionalContent?: React.ReactNode }) => (
    <div>
      {additionalContent}
    </div>
  )
}));

vi.mock('@/hooks/useLearningProgress', () => ({
  useLearningProgress: () => ({
    dailySelection: { newWords: [], reviewWords: [], totalCount: 0, severity: 'light' },
    progressStats: { total: 0, learning: 0, new: 0, due: 0, learned: 1 },
    generateDailyWords: vi.fn(),
    markWordAsPlayed: vi.fn(),
    getLearnedWords: () => [
      {
        word: 'end up /ˈend ʌp/ [intransitive]',
        category: 'phrases',
        isLearned: true,
        reviewCount: 0,
        lastPlayedDate: '',
        status: 'learned',
        nextReviewDate: '',
        createdDate: '',
        learnedDate: '2024-01-01'
      }
    ],
    markWordLearned: vi.fn(),
    markWordAsNew: vi.fn(),
    todayWords: [] as VocabularyWord[]
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
    removeVocabularyChangeListener: vi.fn(),
    hasData: vi.fn().mockReturnValue(true)
  }
}));

vi.mock('@/services/learningTimeService', () => ({
  learningTimeService: { startSession: vi.fn(), stopSession: vi.fn().mockReturnValue(0) }
}));


const searchMock = vi.fn();
vi.mock('@/services/search/vocabularySearch', () => ({
  loadVocabularyIndex: vi.fn().mockResolvedValue(undefined),
  searchVocabulary: searchMock
}));

vi.mock('@/components/vocabulary-app/WordSearchModal', () => {
  const React = require('react');
  return {
    default: ({ isOpen, initialQuery = '' }: { isOpen: boolean; initialQuery?: string }) => {
      if (!isOpen) return null;
      const results = searchMock(initialQuery);
      return (
        <div role="dialog">
          <input placeholder="Search word..." value={initialQuery} readOnly />
          <div>
            {results.map(r => (
              <div key={r.word}>{r.word}</div>
            ))}
          </div>
        </div>
      );
    }
  };
});

beforeEach(async () => {
  await import('@testing-library/jest-dom');
  localStorage.clear();
  searchMock.mockReset();
  searchMock.mockReturnValue([
    { word: 'end up', meaning: '', example: '' },
    { word: 'end', meaning: '', example: '' }
  ]);
});

describe('quick search view', () => {
  it('normalizes query and shows exact match first', async () => {
    render(
      <TooltipProvider>
        <VocabularyAppWithLearning />
      </TooltipProvider>
    );
    const summaryButton = await screen.findByRole('button', { name: /Word Summary/i });
    fireEvent.click(summaryButton);
    const viewButton = await screen.findByRole('button', { name: 'View Word' });
    fireEvent.click(viewButton);

    const dialog = await screen.findByRole('dialog');
    const input = within(dialog).getByPlaceholderText('Search word...') as HTMLInputElement;
    expect(input).toHaveValue('end up');

    const results = within(dialog).getAllByText(/end/);
    expect(results[0].textContent).toContain('end up');
  });
});
