import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LearningProgressService } from '@/services/learningProgressService';
import { VocabularyWord } from '@/types/vocabulary';
import { LearningProgress } from '@/types/learning';
import { calculateNextAllowedTime } from '@/services/timingCalculator';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock global objects for Node.js environment
Object.defineProperty(global, 'localStorage', { 
  value: localStorageMock,
  writable: true 
});

describe('LearningProgressService', () => {
  let service: LearningProgressService;
  let mockWords: VocabularyWord[];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    service = LearningProgressService.getInstance();
    
    mockWords = [
      { word: 'get over', meaning: 'to recover', example: 'Get over it', category: 'phrasal verbs', count: 1 },
      { word: 'break down', meaning: 'to stop working', example: 'Car broke down', category: 'phrasal verbs', count: 1 },
      { word: 'piece of cake', meaning: 'very easy', example: 'It was a piece of cake', category: 'idioms', count: 1 },
      { word: 'environment', meaning: 'surroundings', example: 'Clean environment', category: 'topic vocab', count: 1 },
      { word: 'present perfect', meaning: 'tense form', example: 'I have done', category: 'grammar', count: 1 },
    ];
  });

  describe('Daily Selection Generation', () => {
    it('should generate daily selection with correct ratio (TC001)', () => {
      const selection = service.generateDailySelection(mockWords, 'light');
      
      const totalCount = selection.totalCount;
      const newCount = selection.newWords.length;
      const reviewCount = selection.reviewWords.length;
      
      // With only 5 mock words, total should be 5 (limited by available words)
      expect(totalCount).toBeLessThanOrEqual(mockWords.length);
      expect(totalCount).toBeGreaterThan(0);
      
        // Check 10/90 ratio (±1 acceptable) when possible and when review words exist
        if (totalCount >= 5 && reviewCount > 0) {
          const expectedNew = Math.round(totalCount * 0.1);
          const expectedReview = totalCount - expectedNew;

          expect(Math.abs(newCount - expectedNew)).toBeLessThanOrEqual(1);
          expect(Math.abs(reviewCount - expectedReview)).toBeLessThanOrEqual(1);
        } else {
          // When no review words available, all should be new words
          expect(newCount).toBe(totalCount);
          expect(reviewCount).toBe(0);
        }
    });

    it('should handle fallback when no review words available (TC002)', () => {
      // All words are new, no review words available
      const selection = service.generateDailySelection(mockWords, 'light');
      
      // Should pick more new words when no review available
      expect(selection.newWords.length).toBeGreaterThan(0);
      expect(selection.reviewWords.length).toBe(0);
      expect(selection.totalCount).toBeLessThanOrEqual(mockWords.length);
    });

    it('should respect category weights for new words (TC004)', () => {
      // Create more words to test category distribution
      const manyWords: VocabularyWord[] = [];
      const categories = ['phrasal verbs', 'idioms', 'topic vocab', 'grammar', 'phrases, collocations', 'word formation'];
      
      categories.forEach(category => {
        for (let i = 0; i < 20; i++) {
          manyWords.push({
            word: `${category}-word-${i}`,
            meaning: 'test meaning',
            example: 'test example',
            category,
            count: 1
          });
        }
      });

      const selection = service.generateDailySelection(manyWords, 'moderate');
      
      // Check that topic vocab gets the highest allocation (44% weight)
      const categoryCount = selection.newWords.reduce((acc, word) => {
        acc[word.category] = (acc[word.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topicVocabCount = categoryCount['topic vocab'] || 0;
      const phrasalVerbsCount = categoryCount['phrasal verbs'] || 0;
      
      // Topic vocab should have more words than phrasal verbs due to higher weight
      expect(topicVocabCount).toBeGreaterThanOrEqual(phrasalVerbsCount);
    });

    it('should generate count within severity range (TC009)', () => {
      // Create enough words to test severity ranges
      const manyWords: VocabularyWord[] = [];
      for (let i = 0; i < 120; i++) {
        manyWords.push({
          word: `word-${i}`,
          meaning: 'test meaning',
          example: 'test example',
          category: 'topic vocab',
          count: 1
        });
      }
      
      const lightSelection = service.generateDailySelection(manyWords, 'light');
      const moderateSelection = service.generateDailySelection(manyWords, 'moderate');
      const intenseSelection = service.generateDailySelection(manyWords, 'intense');

      expect(lightSelection.totalCount).toBeGreaterThanOrEqual(15);
      expect(lightSelection.totalCount).toBeLessThanOrEqual(25);

      expect(moderateSelection.totalCount).toBeGreaterThanOrEqual(30);
      expect(moderateSelection.totalCount).toBeLessThanOrEqual(50);

      expect(intenseSelection.totalCount).toBeGreaterThanOrEqual(50);
      expect(intenseSelection.totalCount).toBeLessThanOrEqual(100);
    });

    it('defaults to light severity when none is provided', () => {
      const manyWords: VocabularyWord[] = [];
      for (let i = 0; i < 120; i++) {
        manyWords.push({
          word: `word-${i}`,
          meaning: 'test meaning',
          example: 'test example',
          category: 'topic vocab',
          count: 1
        });
      }

      const selection = service.generateDailySelection(manyWords);

      expect(selection.severity).toBe('light');
      expect(selection.totalCount).toBeGreaterThanOrEqual(15);
      expect(selection.totalCount).toBeLessThanOrEqual(25);
    });

    it('should include all due words when below target and fill with new words', () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      const progressData: Record<string, LearningProgress> = {
        due1: { word: 'due1', category: 'topic vocab', isLearned: true, reviewCount: 1, lastPlayedDate: '', status: 'due', nextReviewDate: yesterday, createdDate: yesterday },
        due2: { word: 'due2', category: 'topic vocab', isLearned: true, reviewCount: 1, lastPlayedDate: '', status: 'due', nextReviewDate: yesterday, createdDate: yesterday },
        new3: { word: 'new3', category: 'topic vocab', isLearned: false, reviewCount: 0, lastPlayedDate: '', status: 'new', nextReviewDate: today, createdDate: today },
        new4: { word: 'new4', category: 'topic vocab', isLearned: false, reviewCount: 0, lastPlayedDate: '', status: 'new', nextReviewDate: today, createdDate: today },
        new5: { word: 'new5', category: 'topic vocab', isLearned: false, reviewCount: 0, lastPlayedDate: '', status: 'new', nextReviewDate: today, createdDate: today },
        new6: { word: 'new6', category: 'topic vocab', isLearned: false, reviewCount: 0, lastPlayedDate: '', status: 'new', nextReviewDate: today, createdDate: today }
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'learningProgress') return JSON.stringify(progressData);
        return null;
      });

      vi.spyOn(service as unknown as { getRandomCount: () => number }, 'getRandomCount').mockReturnValue(5);

      const allWords: VocabularyWord[] = Object.keys(progressData).map(word => ({ word, meaning: 'm', example: 'e', category: 'topic vocab', count: 1 }));

      const selection = service.forceGenerateDailySelection(allWords, 'light');

      expect(selection.reviewWords.map(w => w.word).sort()).toEqual(['due1', 'due2']);
      expect(selection.newWords.length).toBe(3);
      expect(selection.totalCount).toBe(5);
    });

    it('should limit review words to target percentage when many are due', () => {
      const today = new Date().toISOString().split('T')[0];
      const day = 86400000;
      const progressData: Record<string, LearningProgress> = {
        due1: { word: 'due1', category: 'topic vocab', isLearned: true, reviewCount: 1, lastPlayedDate: '', status: 'due', nextReviewDate: new Date(Date.now() - 4 * day).toISOString().split('T')[0], createdDate: today },
        due2: { word: 'due2', category: 'topic vocab', isLearned: true, reviewCount: 1, lastPlayedDate: '', status: 'due', nextReviewDate: new Date(Date.now() - 3 * day).toISOString().split('T')[0], createdDate: today },
        due3: { word: 'due3', category: 'topic vocab', isLearned: true, reviewCount: 1, lastPlayedDate: '', status: 'due', nextReviewDate: new Date(Date.now() - 2 * day).toISOString().split('T')[0], createdDate: today },
        due4: { word: 'due4', category: 'topic vocab', isLearned: true, reviewCount: 1, lastPlayedDate: '', status: 'due', nextReviewDate: new Date(Date.now() - 1 * day).toISOString().split('T')[0], createdDate: today },
        new5: { word: 'new5', category: 'topic vocab', isLearned: false, reviewCount: 0, lastPlayedDate: '', status: 'new', nextReviewDate: today, createdDate: today },
        new6: { word: 'new6', category: 'topic vocab', isLearned: false, reviewCount: 0, lastPlayedDate: '', status: 'new', nextReviewDate: today, createdDate: today }
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'learningProgress') return JSON.stringify(progressData);
        return null;
      });

      vi.spyOn(service as unknown as { getRandomCount: () => number }, 'getRandomCount').mockReturnValue(5);

      const allWords: VocabularyWord[] = Object.keys(progressData).map(word => ({ word, meaning: 'm', example: 'e', category: 'topic vocab', count: 1 }));

      const selection = service.forceGenerateDailySelection(allWords, 'light');

      expect(selection.reviewWords.map(w => w.word)).toEqual(['due1', 'due2', 'due3', 'due4']);
      expect(selection.newWords.length).toBe(1);
      expect(selection.totalCount).toBe(5);
    });

    it('orders review words by earliest nextReviewDate', () => {
      const today = new Date().toISOString().split('T')[0];
      const day = 86400000;

      const progressData: Record<string, LearningProgress> = {
        w1: { word: 'w1', category: 'topic vocab', isLearned: true, reviewCount: 1, lastPlayedDate: '', status: 'due', nextReviewDate: new Date(Date.now() - 3 * day).toISOString().split('T')[0], createdDate: today },
        w2: { word: 'w2', category: 'topic vocab', isLearned: true, reviewCount: 1, lastPlayedDate: '', status: 'due', nextReviewDate: new Date(Date.now() - 1 * day).toISOString().split('T')[0], createdDate: today },
        w3: { word: 'w3', category: 'topic vocab', isLearned: true, reviewCount: 1, lastPlayedDate: '', status: 'due', nextReviewDate: new Date(Date.now() - 2 * day).toISOString().split('T')[0], createdDate: today }
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'learningProgress') return JSON.stringify(progressData);
        return null;
      });

      vi.spyOn(service as unknown as { getRandomCount: () => number }, 'getRandomCount').mockReturnValue(5);

      const allWords: VocabularyWord[] = [
        { word: 'w1', meaning: 'm', example: 'e', category: 'topic vocab', count: 1 },
        { word: 'w2', meaning: 'm', example: 'e', category: 'topic vocab', count: 1 },
        { word: 'w3', meaning: 'm', example: 'e', category: 'topic vocab', count: 1 },
        { word: 'n1', meaning: 'm', example: 'e', category: 'topic vocab', count: 1 },
        { word: 'n2', meaning: 'm', example: 'e', category: 'topic vocab', count: 1 }
      ];

      const selection = service.forceGenerateDailySelection(allWords, 'light');

      expect(selection.reviewWords.map(w => w.word)).toEqual(['w1', 'w3', 'w2']);
    });
  });

  describe('Word Progress Tracking', () => {
    it('should initialize new words correctly (TC010)', () => {
      const word = mockWords[0];
      const progress = service.initializeWord(word);

      expect(progress.word).toBe(word.word);
      expect(progress.isLearned).toBe(false);
      expect(progress.reviewCount).toBe(0);
      expect(progress.status).toBe('new');
      expect(progress.category).toBe(word.category);
    });

    it('should update word progress correctly (TC005, TC006)', () => {
      const word = mockWords[0];
      const progress = service.initializeWord(word);
      
      // Mock localStorage to return the progress
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        [word.word]: progress
      }));

      service.updateWordProgress(word.word);

      // Verify setItem was called with updated progress
      expect(localStorageMock.setItem).toHaveBeenCalled();
      
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      const updatedProgress = savedData[word.word];
      
      expect(updatedProgress.isLearned).toBe(true);
      expect(updatedProgress.reviewCount).toBe(1);
      expect(updatedProgress.status).toBe('due');
      expect(updatedProgress.lastPlayedDate).toBeTruthy();
      expect(updatedProgress.nextReviewDate).toBeTruthy();
    });

    it('should calculate correct next review dates (TC006)', () => {
      const today = new Date().toISOString().split('T')[0];
      const addDays = (days: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
      };

      const p1 = service.initializeWord(mockWords[0]);
      p1.reviewCount = 1; // -> review #2 = +2 days
      const p2 = service.initializeWord(mockWords[1]);
      p2.reviewCount = 2; // -> review #3 = +3 days
      const p3 = service.initializeWord(mockWords[2]);
      p3.reviewCount = 10; // -> review #11 = +60 days

      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify({ [mockWords[0].word]: p1 }))
        .mockReturnValueOnce(JSON.stringify({ [mockWords[1].word]: p2 }))
        .mockReturnValueOnce(JSON.stringify({ [mockWords[2].word]: p3 }));

      service.updateWordProgress(mockWords[0].word);
      service.updateWordProgress(mockWords[1].word);
      service.updateWordProgress(mockWords[2].word);

      const saved1 = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      const saved2 = JSON.parse(localStorageMock.setItem.mock.calls[1][1]);
      const saved3 = JSON.parse(localStorageMock.setItem.mock.calls[2][1]);

      expect(saved1[mockWords[0].word].nextReviewDate).toBe(addDays(2));
      expect(saved2[mockWords[1].word].nextReviewDate).toBe(addDays(3));
      expect(saved3[mockWords[2].word].nextReviewDate).toBe(addDays(60));
    });

    it('should track exposures and next allowed time', () => {
      vi.useFakeTimers();
      const baseTime = new Date('2024-01-01T10:00:00Z');
      vi.setSystemTime(baseTime);

      const word = mockWords[0];
      const progress = service.initializeWord(word);

      const store: Record<string, string> = {
        learningProgress: JSON.stringify({ [word.word]: progress })
      };

      localStorageMock.getItem.mockImplementation((key: string) => store[key] || null);
      localStorageMock.setItem.mockImplementation((key: string, value: string) => {
        store[key] = value;
      });

      service.updateWordProgress(word.word);

      let saved = JSON.parse(store.learningProgress);
      let updated = saved[word.word];
      expect(updated.exposuresToday).toBe(1);
      expect(updated.lastExposureTime).toBe(baseTime.toISOString());
      expect(updated.nextAllowedTime).toBe(
        calculateNextAllowedTime(1, baseTime.toISOString())
      );

      const secondTime = new Date(baseTime.getTime() + 5 * 60000);
      vi.setSystemTime(secondTime);

      service.updateWordProgress(word.word);

      saved = JSON.parse(store.learningProgress);
      updated = saved[word.word];
      expect(updated.exposuresToday).toBe(2);
      expect(updated.lastExposureTime).toBe(secondTime.toISOString());
      expect(updated.nextAllowedTime).toBe(
        calculateNextAllowedTime(2, secondTime.toISOString())
      );

      const nextDay = new Date('2024-01-02T00:01:00Z');
      vi.setSystemTime(nextDay);

      service.updateWordProgress(word.word);

      saved = JSON.parse(store.learningProgress);
      updated = saved[word.word];
      expect(updated.exposuresToday).toBe(1);
      expect(updated.lastExposureTime).toBe(nextDay.toISOString());
      expect(updated.nextAllowedTime).toBe(
        calculateNextAllowedTime(1, nextDay.toISOString())
      );

      vi.useRealTimers();
    });
  });

  describe('Statistics', () => {
    it('excludes learned words from learning count and balances totals', () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      const mockProgress = {
        'word1': { isLearned: true, status: 'not_due', nextReviewDate: today },
        'word2': { isLearned: false, status: 'new', nextReviewDate: today },
        'word3': { isLearned: true, status: 'not_due', nextReviewDate: yesterday },
        'word4': { isLearned: false, status: 'new', nextReviewDate: today },
        'word5': { isLearned: true, status: 'learned', nextReviewDate: tomorrow },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockProgress));

      const stats = service.getProgressStats();

      expect(stats.total).toBe(5);
      expect(stats.learning).toBe(2);
      expect(stats.learned).toBe(1);
      expect(stats.new).toBe(2);
      expect(stats.due).toBe(2);
      expect(stats.learning + stats.learned + stats.new).toBe(stats.total);
    });

    it('should include words with next review date today in due list', () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      const progressData: Record<string, LearningProgress> = {
        todayWord: {
          word: 'todayWord',
          category: 'topic vocab',
          isLearned: true,
          reviewCount: 1,
          lastPlayedDate: '',
          status: 'not_due',
          nextReviewDate: today,
          createdDate: today
        },
        futureWord: {
          word: 'futureWord',
          category: 'topic vocab',
          isLearned: true,
          reviewCount: 1,
          lastPlayedDate: '',
          status: 'not_due',
          nextReviewDate: tomorrow,
          createdDate: today
        }
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'learningProgress') return JSON.stringify(progressData);
        return null;
      });

      const dueWords = service.getDueReviewWords();
      expect(dueWords.map(w => w.word)).toEqual(['todayWord']);
    });

    it('should return due words sorted by next review date', () => {
      const today = new Date().toISOString().split('T')[0];
      const day = 86400000;
      const progressData: Record<string, LearningProgress> = {
        word2: {
          word: 'word2',
          category: 'topic vocab',
          isLearned: true,
          reviewCount: 1,
          lastPlayedDate: '',
          status: 'due',
          nextReviewDate: new Date(Date.now() - 1 * day).toISOString().split('T')[0],
          createdDate: today
        },
        word1: {
          word: 'word1',
          category: 'topic vocab',
          isLearned: true,
          reviewCount: 1,
          lastPlayedDate: '',
          status: 'due',
          nextReviewDate: new Date(Date.now() - 3 * day).toISOString().split('T')[0],
          createdDate: today
        },
        word3: {
          word: 'word3',
          category: 'topic vocab',
          isLearned: true,
          reviewCount: 1,
          lastPlayedDate: '',
          status: 'due',
          nextReviewDate: new Date(Date.now() - 2 * day).toISOString().split('T')[0],
          createdDate: today
        }
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'learningProgress') return JSON.stringify(progressData);
        return null;
      });

      const dueWords = service.getDueReviewWords();
      expect(dueWords.map(w => w.word)).toEqual(['word1', 'word3', 'word2']);
    });
  });

  describe('Caching', () => {
    it('should cache daily selection for same day', () => {
      const today = new Date().toISOString().split('T')[0];
      const mockSelection = {
        newWords: [],
        reviewWords: [],
        totalCount: 20,
        severity: 'moderate'
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'lastSelectionDate') return today;
        if (key === 'dailySelection') return JSON.stringify(mockSelection);
        return null;
      });

      const selection = service.generateDailySelection(mockWords, 'moderate');
      
      expect(selection).toEqual(mockSelection);
    });
  });
});