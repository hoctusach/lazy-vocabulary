import type { VocabularyWord } from '@/types/vocabulary';
import type {
  DailySelection,
  LearningProgress,
  SeverityConfig,
  SeverityLevel
} from '@/types/learning';
import { getLearned, upsertLearned, setReview } from '@/lib/db/learned';
import {
  DAILY_SELECTION_KEY,
  LEARNING_PROGRESS_KEY
} from '@/utils/storageKeys';

const DEFAULT_SEVERITY_CONFIG: SeverityConfig = {
  light: { min: 15, max: 25 },
  moderate: { min: 30, max: 50 },
  intense: { min: 50, max: 100 }
};

type StoredProgress = Partial<LearningProgress> & {
  word?: string;
  category?: string;
};

export class LearningProgressService {
  private readonly severityConfig: SeverityConfig = DEFAULT_SEVERITY_CONFIG;

  static getInstance() {
    return new LearningProgressService();
  }

  private getStorage(): Storage | null {
    try {
      const globalRef = globalThis as unknown as { localStorage?: Storage };
      return globalRef?.localStorage ?? null;
    } catch (error) {
      console.warn('[LearningProgressService] localStorage unavailable', error);
      return null;
    }
  }

  private getTodayKey(): string {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }

  private getSelectionStorageKey(date: string): string {
    return `${DAILY_SELECTION_KEY}:${date}`;
  }

  private buildWordKey(word: string, category?: string): string {
    return category ? `${word}::${category}` : word;
  }

  private loadProgressMap(): Record<string, StoredProgress> {
    const storage = this.getStorage();
    if (!storage) return {};

    try {
      const raw = storage.getItem(LEARNING_PROGRESS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const map: Record<string, StoredProgress> = {};
        for (const entry of parsed) {
          if (entry && typeof entry === 'object') {
            const progress = entry as StoredProgress;
            const key = this.buildWordKey(progress.word ?? '', progress.category);
            if (key.trim()) map[key] = progress;
          }
        }
        return map;
      }
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, StoredProgress>;
      }
    } catch (error) {
      console.warn('[LearningProgressService] Failed to parse learning progress', error);
    }

    return {};
  }

  private normaliseProgress(
    word: VocabularyWord,
    stored?: StoredProgress
  ): LearningProgress {
    const today = this.getTodayKey();
    const category = stored?.category ?? word.category ?? 'general';
    const status = stored?.status ?? (stored?.isLearned ? 'not_due' : 'new');

    return {
      word: stored?.word ?? word.word,
      type: stored?.type,
      category,
      isLearned: stored?.isLearned ?? false,
      reviewCount: stored?.reviewCount ?? 0,
      lastPlayedDate: stored?.lastPlayedDate ?? '',
      status,
      nextReviewDate: stored?.nextReviewDate ?? '',
      createdDate: stored?.createdDate ?? today,
      learnedDate: stored?.learnedDate,
      nextAllowedTime: stored?.nextAllowedTime
    };
  }

  private isDue(stored?: StoredProgress): boolean {
    if (!stored) return false;
    if (stored.status === 'due') return true;

    const candidate = stored.nextReviewDate ?? stored.nextAllowedTime;
    if (!candidate) return false;

    const timestamp = Date.parse(candidate);
    if (Number.isNaN(timestamp)) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return timestamp <= today.getTime();
  }

  private persistSelection(date: string, selection: DailySelection): void {
    const storage = this.getStorage();
    if (!storage) return;

    try {
      storage.setItem(this.getSelectionStorageKey(date), JSON.stringify(selection));
      storage.setItem(DAILY_SELECTION_KEY, JSON.stringify(selection));
    } catch (error) {
      console.warn('[LearningProgressService] Failed to persist daily selection', error);
    }
  }

  private getStoredProgress(
    progressMap: Record<string, StoredProgress>,
    word: VocabularyWord
  ): StoredProgress | undefined {
    const primary = this.buildWordKey(word.word, word.category);
    return progressMap[primary] ?? progressMap[word.word];
  }

  async getLearnedWords(): Promise<{ word: string }[]> {
    const rows = await getLearned();
    return rows.map(r => ({ word: r.word_id }));
  }

  async markWordLearned(wordKey: string): Promise<void> {
    await upsertLearned(wordKey, false);
  }

  async markWordAsNew(wordKey: string): Promise<void> {
    await setReview(wordKey, false);
  }

  // Placeholder implementations for compatibility
  getProgressStats() {
    return { learnedCount: 0, dueCount: 0 };
  }

  updateWordProgress(wordKey: string): void {
    void upsertLearned(wordKey, true);
  }

  getWordProgress(_wordKey: string) {
    return undefined;
  }

  forceGenerateDailySelection(
    words: VocabularyWord[],
    severity: SeverityLevel = 'light'
  ): DailySelection {
    const severityKey: SeverityLevel = this.severityConfig[severity]
      ? severity
      : 'light';
    const config = this.severityConfig[severityKey];
    const todayKey = this.getTodayKey();
    const progressMap = this.loadProgressMap();

    const reviewCandidates: LearningProgress[] = [];
    const newCandidates: LearningProgress[] = [];

    for (const word of words) {
      const stored = this.getStoredProgress(progressMap, word);
      if (stored) {
        const normalised = this.normaliseProgress(word, stored);
        if (this.isDue(stored)) {
          normalised.status = 'due';
          reviewCandidates.push(normalised);
          continue;
        }

        if (!stored.isLearned) {
          normalised.status = 'new';
          newCandidates.push(normalised);
        }
        continue;
      }

      newCandidates.push(this.normaliseProgress(word));
    }

    reviewCandidates.sort((a, b) => {
      const aTime = a.nextReviewDate ? Date.parse(a.nextReviewDate) : Number.POSITIVE_INFINITY;
      const bTime = b.nextReviewDate ? Date.parse(b.nextReviewDate) : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });

    const available = reviewCandidates.length + newCandidates.length;
    const maxTarget = Math.min(config.max, available);
    const target = available >= config.min ? maxTarget : available;

    const reviewWords = reviewCandidates.slice(0, Math.min(reviewCandidates.length, target));
    const remaining = Math.max(0, target - reviewWords.length);
    const newWords = newCandidates.slice(0, remaining);
    const totalCount = reviewWords.length + newWords.length;

    const selection: DailySelection = {
      newWords,
      reviewWords,
      totalCount,
      severity: severityKey
    };

    this.persistSelection(todayKey, selection);

    return selection;
  }

  getTodaySelection(): DailySelection | null {
    const storage = this.getStorage();
    if (!storage) return null;

    const todayKey = this.getTodayKey();
    const keysToTry = [this.getSelectionStorageKey(todayKey), DAILY_SELECTION_KEY];

    for (const key of keysToTry) {
      const raw = storage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as DailySelection | { selection?: DailySelection };
        if (parsed && typeof parsed === 'object') {
          if ('newWords' in parsed && 'reviewWords' in parsed) {
            return parsed as DailySelection;
          }
          if ('selection' in parsed && parsed.selection) {
            return parsed.selection as DailySelection;
          }
        }
      } catch (error) {
        console.warn('[LearningProgressService] Failed to parse cached daily selection', error);
      }
    }

    return null;
  }
}

export const learningProgressService = LearningProgressService.getInstance();
