import type { VocabularyWord } from '@/types/vocabulary';
import type { DailySelection } from '@/types/learning';
import { getLearned, upsertLearned, setReview } from '@/lib/db/learned';

export class LearningProgressService {
  static getInstance() {
    return new LearningProgressService();
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

  forceGenerateDailySelection(_words: VocabularyWord[], _severity: any): DailySelection | null {
    return null;
  }

  getTodaySelection(): DailySelection | null {
    return null;
  }
}

export const learningProgressService = LearningProgressService.getInstance();
