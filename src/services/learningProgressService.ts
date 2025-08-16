import { LearningProgress, DailySelection, SeverityLevel, CategoryWeights } from '@/types/learning';
import { VocabularyWord } from '@/types/vocabulary';
import { getLocalDateISO } from '@/utils/date';

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
    return getLocalDateISO();
  }

  private addDays(date: string, days: number): string {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return getLocalDateISO(d);
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

  private getLearningProgress(): Map<string, LearningProgress> {
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
      learnedDate: undefined,
      nextReviewDate: this.getToday(),
      createdDate: this.getToday(),
      nextAllowedTime: new Date().toISOString()
    };

    return {
      ...progress,
      status: progress.status || (progress.isLearned ? 'due' : DEFAULT_VALUES.status),
      nextReviewDate: progress.nextReviewDate || DEFAULT_VALUES.nextReviewDate,
      createdDate: progress.createdDate || DEFAULT_VALUES.createdDate,
      nextAllowedTime: progress.nextAllowedTime || DEFAULT_VALUES.nextAllowedTime,
      learnedDate:
        (progress as any).learnedDate ||
        (progress as any).retiredDate ||
        DEFAULT_VALUES.learnedDate
    };
  }

  private saveLearningProgress(progressMap: Map<string, LearningProgress>): void {
    const data = Object.fromEntries(progressMap);
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
      createdDate: today,
      nextAllowedTime: new Date().toISOString()
    };
  }

  updateWordProgress(wordKey: string): void {
    const progressMap = this.getLearningProgress();
    const progress = progressMap.get(wordKey);
    
    if (progress) {
      const today = this.getToday();
      progress.lastPlayedDate = today;
      progress.isLearned = true;
      progress.reviewCount += 1;
      progress.nextReviewDate = this.calculateNextReviewDate(progress.reviewCount);
      progress.status = 'due';
      progress.nextAllowedTime = new Date().toISOString();
      
      progressMap.set(wordKey, progress);
      this.saveLearningProgress(progressMap);
    }
  }

  retireWord(wordKey: string): void {
    const progressMap = this.getLearningProgress();
    const progress = progressMap.get(wordKey);
    
    if (progress) {
      const today = this.getToday();
      progress.status = 'retired';
      progress.learnedDate = today;
      progress.nextReviewDate = this.addDays(today, 100);
      
      progressMap.set(wordKey, progress);
      this.saveLearningProgress(progressMap);
    }
  }

  updateWordStatuses(): void {
    const progressMap = this.getLearningProgress();
    const today = this.getToday();
    let hasChanges = false;

    progressMap.forEach((progress, key) => {
      if (progress.status === 'retired') return;

      if (progress.isLearned) {
        if (progress.nextReviewDate <= today && progress.status !== 'due') {
          progress.status = 'due';
          progressMap.set(key, progress);
          hasChanges = true;
        } else if (progress.nextReviewDate > today && progress.status !== 'not_due') {
          progress.status = 'not_due';
          progressMap.set(key, progress);
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      this.saveLearningProgress(progressMap);
    }
  }

  generateDailySelection(
    allWords: VocabularyWord[], 
    severity: SeverityLevel = 'moderate'
  ): DailySelection {
    const today = this.getToday();
    const lastSelectionDate = localStorage.getItem(LAST_SELECTION_DATE_KEY);
    
    // Return cached selection if already generated today
    if (lastSelectionDate === today) {
      const cached = localStorage.getItem(DAILY_SELECTION_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    return this.forceGenerateDailySelection(allWords, severity);
  }

  forceGenerateDailySelection(
    allWords: VocabularyWord[], 
    severity: SeverityLevel = 'moderate'
  ): DailySelection {
    const today = this.getToday();

    this.updateWordStatuses();
    const progressMap = this.getLearningProgress();
    
    // Initialize progress for new words
    allWords.forEach(word => {
      if (!progressMap.has(word.word)) {
        progressMap.set(word.word, this.initializeWord(word));
      }
    });
    this.saveLearningProgress(progressMap);

    // Adjust target count based on available words
    const maxPossibleCount = allWords.length;
    const idealCount = this.getRandomCount(severity);
    const totalCount = Math.min(idealCount, maxPossibleCount);

    // Get available words
    const newWords = Array.from(progressMap.values()).filter(p => !p.isLearned && p.status !== 'retired');
    const dueWords = Array.from(progressMap.values()).filter(p => p.isLearned && p.nextReviewDate <= today);

    // Always include all due review words
    const selectedReview = dueWords;

    // Fill remaining slots with new words
    const remainingSlots = Math.max(totalCount - selectedReview.length, 0);
    const selectedNew = this.selectNewWordsByCategory(newWords, Math.min(remainingSlots, newWords.length));

    const selection: DailySelection = {
      newWords: selectedNew,
      reviewWords: selectedReview,
      totalCount: selectedNew.length + selectedReview.length,
      severity
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

  getWordProgress(wordKey: string): LearningProgress | null {
    const progressMap = this.getLearningProgress();
    return progressMap.get(wordKey) || null;
  }

  getProgressStats() {
    const progressMap = this.getLearningProgress();
    const all = Array.from(progressMap.values());
    const today = this.getToday();

    return {
      total: all.length,
      learned: all.filter(p => p.isLearned).length,
      new: all.filter(p => !p.isLearned).length,
      due: all.filter(p => p.isLearned && p.nextReviewDate <= today).length,
      retired: all.filter(p => p.status === 'retired').length
    };
  }

  getDueReviewWords(): LearningProgress[] {
    const progressMap = this.getLearningProgress();
    const today = this.getToday();
    return Array.from(progressMap.values()).filter(p => p.isLearned && p.nextReviewDate <= today);
  }

  getRetiredWords(): LearningProgress[] {
    const progressMap = this.getLearningProgress();
    return Array.from(progressMap.values())
      .filter(p => p.status === 'retired')
      .sort((a, b) => a.word.localeCompare(b.word)); // Sort alphabetically
  }
}

export const learningProgressService = LearningProgressService.getInstance();
