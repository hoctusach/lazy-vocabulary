/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VocabularyWord } from '@/types/vocabulary';

const containerProps: { initialWords?: VocabularyWord[] } = {};

vi.mock('@/components/vocabulary-app/VocabularyAppContainerNew', () => ({
  default: (props: { initialWords?: VocabularyWord[] }) => {
    containerProps.initialWords = props.initialWords;
    return <div data-testid="container" />;
  },
}));

vi.mock('@/hooks/useDailyUsageTracker', () => ({ useDailyUsageTracker: () => undefined }));

// Signed out / fresh install: no user key, so no account-backed daily list.
const learning = {
  dailySelection: null,
  progressStats: { total: 0, learning: 0, new: 0, due: 0, learned: 0 },
  generateDailyWords: vi.fn(),
  markWordAsPlayed: vi.fn(),
  markWordLearned: vi.fn(),
  markWordAsNew: vi.fn(),
  todayWords: [] as unknown[],
  learnedWords: [],
  newTodayLearnedWords: [],
  dueTodayLearnedWords: [],
  isDailySelectionLoading: false,
  progressError: null,
};
vi.mock('@/hooks/useLearningProgress', () => ({ useLearningProgress: () => learning }));

import VocabularyAppWithLearning from '@/components/VocabularyAppWithLearning';

describe('VocabularyAppWithLearning fresh install', () => {
  beforeEach(() => {
    localStorage.clear();
    containerProps.initialWords = undefined;
    learning.todayWords = [];
    learning.isDailySelectionLoading = false;
  });

  it('plays the local default sheet when there is no account-backed daily list', () => {
    render(<VocabularyAppWithLearning view="learn" />);
    expect(containerProps.initialWords?.length ?? 0).toBeGreaterThan(0);
  });

  it('prefers the daily list when one exists', () => {
    learning.todayWords = [
      { word_id: 'a', word: 'alpha', meaning: 'm', example: 'e', count: 0, category: 'c' },
    ];
    render(<VocabularyAppWithLearning view="learn" />);
    expect(containerProps.initialWords?.map((w) => w.word)).toEqual(['alpha']);
  });
});
