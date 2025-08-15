import { LearningProgress, DailySelection, SeverityLevel, CategoryWeights } from '@/types/learning';
import { VocabularyWord } from '@/types/vocabulary';

const API_BASE_URL = 'http://localhost:8003';
const CURRENT_USER_ID = 'admin-user'; // For POC, use fixed user ID

const LEARNING_PROGRESS_KEY = 'learningProgress';
const DAILY_SELECTION_KEY = 'dailySelection';
const LAST_SELECTION_DATE_KEY = 'lastSelectionDate';

export class LearningProgressService {
  private static instance: LearningProgressService;
  
  private readonly severityConfig = {
    light: { min: 15, max: 25 },
    moderate: { min: 30, max: 50 },
    intense: { min: 50, max: 100 }
  };

  private readonly categoryWeights: CategoryWeights = {
    'phrasal verbs': 0.13,
    'idioms': 0.07,
    'topic vocab': 0.44,
    'grammar': 0.03,
    'phrases, collocations': 0.05,
    'word formation': 0.06
  };

  static getInstance(): LearningProgressService {
    if (!LearningProgressService.instance) {
      LearningProgressService.instance = new LearningProgressService();
    }
    return LearningProgressService.instance;
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  private addDays(date: string, days: number): string {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  private getRandomCount(severity: SeverityLevel): number {
    const config = this.severityConfig[severity];
    return Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
  }

  private calculateNextReviewDate(reviewCount: number): string {
    const today = this.getToday();
    switch (reviewCount) {
      case 1: return this.addDays(today, 1);
      case 2: return this.addDays(today, 2);
      case 3: return this.addDays(today, 4);
      default: return this.addDays(today, 7);
    }
  }

  private async getLearningProgress(): Promise<Map<string, LearningProgress>> {
    try {
      // Try to get from backend first
      const response = await fetch(`${API_BASE_URL}/api/learning/progress/${CURRENT_USER_ID}`);
      if (response.ok) {
        const data = await response.json();
        const progressMap = new Map<string, LearningProgress>();
        Object.entries(data).forEach(([key, value]) => {
          const progress = this.migrateProgressData(value as LearningProgress);
          progressMap.set(key, progress);
        });
        return progressMap;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem(LEARNING_PROGRESS_KEY);
    const progressMap = new Map<string, LearningProgress>();
    
    if (stored) {
      const data = JSON.parse(stored);
      Object.entries(data).forEach(([key, value]) => {
        const progress = this.migrateProgressData(value as LearningProgress);
        progressMap.set(key, progress);
      });
    }
    
    return progressMap;
  }

  private migrateProgressData(progress: LearningProgress): LearningProgress {
    const DEFAULT_VALUES = {
      status: 'new' as const,
      retiredDate: undefined,
      nextReviewDate: this.getToday(),
      createdDate: this.getToday()
    };

    return {
      ...progress,
      status: progress.status || (progress.isLearned ? 'due' : DEFAULT_VALUES.status),
      nextReviewDate: progress.nextReviewDate || DEFAULT_VALUES.nextReviewDate,
      createdDate: progress.createdDate || DEFAULT_VALUES.createdDate,
      retiredDate: progress.retiredDate || DEFAULT_VALUES.retiredDate
    };
  }

  private async saveLearningProgress(progressMap: Map<string, LearningProgress>): Promise<void> {
    const data = Object.fromEntries(progressMap);
    
    try {
      // Try to save to backend first
      const response = await fetch(`${API_BASE_URL}/api/learning/progress/${CURRENT_USER_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        // Also save to localStorage as backup
        localStorage.setItem(LEARNING_PROGRESS_KEY, JSON.stringify(data));
        return;
      }
    } catch (error) {
      console.warn('Backend save failed, using localStorage:', error);
    }
    
    // Fallback to localStorage only
    localStorage.setItem(LEARNING_PROGRESS_KEY, JSON.stringify(data));
  }

  initializeWord(word: VocabularyWord): LearningProgress {
    const today = this.getToday();
    return {
      word: word.word,
      type: word.category || 'unknown',
      category: word.category || 'topic vocab',
      isLearned: false,
      reviewCount: 0,
      lastPlayedDate: '',
      status: 'new',
      nextReviewDate: today,
      createdDate: today
    };
  }

  async updateWordProgress(wordKey: string): Promise<void> {
    const progressMap = await this.getLearningProgress();
    const progress = progressMap.get(wordKey);
    
    if (progress) {
      const today = this.getToday();
      progress.lastPlayedDate = today;
      progress.isLearned = true;
      progress.reviewCount += 1;
      progress.nextReviewDate = this.calculateNextReviewDate(progress.reviewCount);
      progress.status = 'due';
      
      progressMap.set(wordKey, progress);
      await this.saveLearningProgress(progressMap);
    }
  }

  async retireWord(wordKey: string): Promise<void> {
    const progressMap = await this.getLearningProgress();
    const progress = progressMap.get(wordKey);
    
    if (progress) {
      const today = this.getToday();
      progress.status = 'retired';
      progress.retiredDate = today;
      progress.nextReviewDate = this.addDays(today, 100);
      
      progressMap.set(wordKey, progress);
      await this.saveLearningProgress(progressMap);
    }
  }

  async updateWordStatuses(): Promise<void> {
    const progressMap = await this.getLearningProgress();
    const today = this.getToday();
    let hasChanges = false;

    progressMap.forEach((progress, key) => {
      if (progress.nextReviewDate <= today && progress.status !== 'due') {
        progress.status = 'due';
        progressMap.set(key, progress);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      await this.saveLearningProgress(progressMap);
    }
  }

  async generateDailySelection(
    allWords: VocabularyWord[], 
    severity: SeverityLevel = 'moderate'
  ): Promise<DailySelection> {
    const today = this.getToday();
    const lastSelectionDate = localStorage.getItem(LAST_SELECTION_DATE_KEY);
    
    // Return cached selection if already generated today
    if (lastSelectionDate === today) {
      const cached = localStorage.getItem(DAILY_SELECTION_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    return await this.forceGenerateDailySelection(allWords, severity);
  }

  async forceGenerateDailySelection(
    allWords: VocabularyWord[], 
    severity: SeverityLevel = 'moderate'
  ): Promise<DailySelection> {
    const today = this.getToday();

    this.updateWordStatuses();
    const progressMap = await this.getLearningProgress();
    
    // Initialize progress for new words
    allWords.forEach(word => {
      if (!progressMap.has(word.word)) {
        progressMap.set(word.word, this.initializeWord(word));
      }
    });
    await this.saveLearningProgress(progressMap);

    // Adjust target count based on available words
    const maxPossibleCount = allWords.length;
    const idealCount = this.getRandomCount(severity);
    const totalCount = Math.min(idealCount, maxPossibleCount);
    
    const newCount = Math.round(totalCount * 0.4);
    const reviewCount = totalCount - newCount;

    // Get available words (exclude retired)
    const newWords = Array.from(progressMap.values()).filter(p => !p.isLearned && p.status !== 'retired');
    const dueWords = Array.from(progressMap.values()).filter(p => p.status === 'due');

    // Select words with fallback logic
    let selectedNew = this.selectNewWordsByCategory(newWords, Math.min(newCount, newWords.length));
    let selectedReview = this.shuffleArray(dueWords).slice(0, Math.min(reviewCount, dueWords.length));

    // Fallback logic - fill remaining slots
    const remainingSlots = totalCount - selectedNew.length - selectedReview.length;
    if (remainingSlots > 0) {
      const availableNew = newWords.filter(w => !selectedNew.includes(w));
      const availableReview = dueWords.filter(w => !selectedReview.includes(w));
      const allAvailable = [...availableNew, ...availableReview];
      
      const shuffledAvailable = this.shuffleArray(allAvailable);
      const additional = shuffledAvailable.slice(0, remainingSlots);
      
      additional.forEach(word => {
        if (availableNew.includes(word)) {
          selectedNew.push(word);
        } else {
          selectedReview.push(word);
        }
      });
    }

    const selection: DailySelection = {
      newWords: selectedNew,
      reviewWords: selectedReview,
      totalCount: selectedNew.length + selectedReview.length
    };

    // Cache the selection
    localStorage.setItem(DAILY_SELECTION_KEY, JSON.stringify(selection));
    localStorage.setItem(LAST_SELECTION_DATE_KEY, today);

    return selection;
  }

  private selectNewWordsByCategory(newWords: LearningProgress[], targetCount: number): LearningProgress[] {
    if (newWords.length === 0 || targetCount === 0) {
      return [];
    }
    
    const wordsByCategory = new Map<string, LearningProgress[]>();
    
    // Group words by category
    newWords.forEach(word => {
      const category = word.category;
      if (!wordsByCategory.has(category)) {
        wordsByCategory.set(category, []);
      }
      wordsByCategory.get(category)!.push(word);
    });

    const selected: LearningProgress[] = [];
    const availableCategories = Array.from(wordsByCategory.keys());
    
    // Calculate quota per category
    availableCategories.forEach(category => {
      const weight = this.categoryWeights[category as keyof CategoryWeights] || 0;
      const quota = Math.round(targetCount * weight);
      const categoryWords = wordsByCategory.get(category) || [];
      const shuffled = this.shuffleArray(categoryWords);
      selected.push(...shuffled.slice(0, Math.min(quota, shuffled.length)));
    });

    // If we don't have enough, fill from remaining words
    if (selected.length < targetCount) {
      const remaining = newWords.filter(w => !selected.includes(w));
      const shuffled = this.shuffleArray(remaining);
      selected.push(...shuffled.slice(0, Math.min(targetCount - selected.length, remaining.length)));
    }

    return selected.slice(0, Math.min(targetCount, newWords.length));
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getTodaySelection(): DailySelection | null {
    const today = this.getToday();
    const lastSelectionDate = localStorage.getItem(LAST_SELECTION_DATE_KEY);
    
    if (lastSelectionDate === today) {
      const cached = localStorage.getItem(DAILY_SELECTION_KEY);
      return cached ? JSON.parse(cached) : null;
    }
    
    return null;
  }

  async getWordProgress(wordKey: string): Promise<LearningProgress | null> {
    const progressMap = await this.getLearningProgress();
    return progressMap.get(wordKey) || null;
  }

  async getProgressStats(allWords: VocabularyWord[] = []) {
    // Total should be from local vocabulary word list
    const totalWordsCount = allWords.length;
    
    // Other counts from backend/localStorage progress data
    const progressMap = await this.getLearningProgress();
    const all = Array.from(progressMap.values());
    
    return {
      total: totalWordsCount, // From local vocabulary list
      learned: all.filter(p => p.isLearned).length,
      new: totalWordsCount - all.length, // Words not yet in progress = new words
      due: all.filter(p => p.status === 'due' && p.isLearned).length,
      retired: all.filter(p => p.status === 'retired').length
    };
  }

  async getDueReviewWords(): Promise<LearningProgress[]> {
    const progressMap = await this.getLearningProgress();
    return Array.from(progressMap.values()).filter(p => p.status === 'due' && p.isLearned);
  }

  async getRetiredWords(): Promise<LearningProgress[]> {
    const progressMap = await this.getLearningProgress();
    return Array.from(progressMap.values())
      .filter(p => p.status === 'retired')
      .sort((a, b) => a.word.localeCompare(b.word)); // Sort alphabetically
  }
}

export const learningProgressService = LearningProgressService.getInstance();
