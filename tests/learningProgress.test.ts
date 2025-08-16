import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LearningProgressService } from '@/services/learningProgressService';
import { VocabularyWord } from '@/types/vocabulary';
import { LearningProgress } from '@/types/learning';
import { EXPOSURE_DELAYS } from '@/services/timingCalculator';

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
      
      // Check 40/60 ratio (±1 acceptable) when possible and when review words exist
      if (totalCount >= 5 && reviewCount > 0) {
        const expectedNew = Math.round(totalCount * 0.4);
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

    it('should include all due words and fill with new words', () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      const progressData: Record<string, LearningProgress> = {
        due1: { word: 'due1', category: 'topic vocab', isLearned: true, reviewCount: 1, lastPlayedDate: '', exposuresToday: 0, lastExposureTime: '', nextAllowedTime: '', status: 'due', nextReviewDate: yesterday, createdDate: yesterday },
        due2: { word: 'due2', category: 'topic vocab', isLearned: true, reviewCount: 1, lastPlayedDate: '', exposuresToday: 0, lastExposureTime: '', nextAllowedTime: '', status: 'due', nextReviewDate: yesterday, createdDate: yesterday },
        new3: { word: 'new3', category: 'topic vocab', isLearned: false, reviewCount: 0, lastPlayedDate: '', exposuresToday: 0, lastExposureTime: '', nextAllowedTime: '', status: 'new', nextReviewDate: today, createdDate: today },
        new4: { word: 'new4', category: 'topic vocab', isLearned: false, reviewCount: 0, lastPlayedDate: '', exposuresToday: 0, lastExposureTime: '', nextAllowedTime: '', status: 'new', nextReviewDate: today, createdDate: today },
        new5: { word: 'new5', category: 'topic vocab', isLearned: false, reviewCount: 0, lastPlayedDate: '', exposuresToday: 0, lastExposureTime: '', nextAllowedTime: '', status: 'new', nextReviewDate: today, createdDate: today },
        new6: { word: 'new6', category: 'topic vocab', isLearned: false, reviewCount: 0, lastPlayedDate: '', exposuresToday: 0, lastExposureTime: '', nextAllowedTime: '', status: 'new', nextReviewDate: today, createdDate: today }
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

    it('should reset daily exposures and calculate next allowed time', () => {
      const word = mockWords[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const progress = {
        ...service.initializeWord(word),
        exposuresToday: 2,
        lastExposureTime: yesterday,
        nextAllowedTime: yesterday
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        [word.word]: progress
      }));

      service.updateWordProgress(word.word);

      const lastCall = localStorageMock.setItem.mock.calls.at(-1);
      const savedData = JSON.parse(lastCall[1]);
      const updatedProgress = savedData[word.word];

      expect(updatedProgress.exposuresToday).toBe(1);

      const expectedNext = new Date(updatedProgress.lastExposureTime);
      expectedNext.setMinutes(expectedNext.getMinutes() + EXPOSURE_DELAYS[1]);
      expect(updatedProgress.nextAllowedTime).toBe(expectedNext.toISOString());
    });

    it('should calculate correct next review dates (TC006)', () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Test review count 1 -> +1 day
      const progress1 = service.initializeWord(mockWords[0]);
      progress1.reviewCount = 1;
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        [mockWords[0].word]: progress1
      }));
      
      service.updateWordProgress(mockWords[0].word);
      
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      const updated = savedData[mockWords[0].word];
      
      // Should be tomorrow
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() + 2); // +1 day for count 2
      const expected = expectedDate.toISOString().split('T')[0];
      
      expect(updated.nextReviewDate).toBe(expected);
    });
  });

  describe('Statistics', () => {
    it('should calculate progress stats correctly', () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const mockProgress = {
        'word1': { isLearned: true, status: 'not_due', nextReviewDate: today, exposuresToday: 0, lastExposureTime: '', nextAllowedTime: '' },
        'word2': { isLearned: false, status: 'new', nextReviewDate: today, exposuresToday: 0, lastExposureTime: '', nextAllowedTime: '' },
        'word3': { isLearned: true, status: 'not_due', nextReviewDate: yesterday, exposuresToday: 0, lastExposureTime: '', nextAllowedTime: '' },
        'word4': { isLearned: false, status: 'new', nextReviewDate: today, exposuresToday: 0, lastExposureTime: '', nextAllowedTime: '' },
      } as Record<string, LearningProgress>;

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockProgress));
      
      const stats = service.getProgressStats();
      
      expect(stats.total).toBe(4);
      expect(stats.learned).toBe(2);
      expect(stats.new).toBe(2);
      expect(stats.due).toBe(2);
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
          exposuresToday: 0,
          lastExposureTime: '',
          nextAllowedTime: '',
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
          exposuresToday: 0,
          lastExposureTime: '',
          nextAllowedTime: '',
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