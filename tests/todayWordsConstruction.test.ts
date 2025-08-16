import { describe, it, expect } from 'vitest';
import { buildTodaysWords } from '@/utils/todayWords';
import { LearningProgress } from '@/types/learning';
import { VocabularyWord } from '@/types/vocabulary';

describe('buildTodaysWords', () => {
  const allWords: VocabularyWord[] = [
    { word: 'a', meaning: 'm1', example: 'e1', category: 'cat1', count: 1 },
    { word: 'b', meaning: 'm2', example: 'e2', category: 'cat2', count: 1 },
    { word: 'c', meaning: 'm3', example: 'e3', category: 'cat1', count: 1 },
  ];

  const newWords: LearningProgress[] = [
    { word: 'a', category: 'cat1', isLearned: false, reviewCount: 0, lastPlayedDate: '', exposuresToday: 0, lastExposureTime: '', nextAllowedTime: '', status: 'new', nextReviewDate: '', createdDate: '' },
    { word: 'b', category: 'cat2', isLearned: false, reviewCount: 0, lastPlayedDate: '', exposuresToday: 0, lastExposureTime: '', nextAllowedTime: '', status: 'new', nextReviewDate: '', createdDate: '' },
  ];

  const reviewWords: LearningProgress[] = [
    { word: 'a', category: 'cat1', isLearned: true, reviewCount: 1, lastPlayedDate: '', exposuresToday: 0, lastExposureTime: '', nextAllowedTime: '', status: 'due', nextReviewDate: '', createdDate: '' },
    { word: 'c', category: 'cat1', isLearned: true, reviewCount: 2, lastPlayedDate: '', exposuresToday: 0, lastExposureTime: '', nextAllowedTime: '', status: 'due', nextReviewDate: '', createdDate: '' },
  ];

  it('creates a de-duplicated union of new and review words', () => {
    const result = buildTodaysWords(newWords, reviewWords, allWords, 'ALL');
    expect(result.map(w => w.word).sort()).toEqual(['a', 'b', 'c']);
  });

  it('filters by category when provided', () => {
    const result = buildTodaysWords(newWords, reviewWords, allWords, 'cat1');
    expect(result.map(w => w.word).sort()).toEqual(['a', 'c']);
  });
});
