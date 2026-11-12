import type { SheetData } from '@/types/vocabulary';

export type WordSetSource = 'builtin' | 'csv' | 'xlsx' | 'json';

export interface StoredWordSet {
  id: string;
  name: string;
  source: WordSetSource;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  fileName?: string;
  /** Omitted for the built-in Default set, which ships with the app. */
  data?: SheetData;
}

export interface WordProgress {
  status: 'learning' | 'learned';
  reviewCount: number;
  lastReviewedAt?: string;
  learnedAt?: string;
  nextReviewAt?: string;
}

export type SetProgressMap = Record<string, Record<string, WordProgress>>;

export interface WordSetStats {
  total: number;
  learned: number;
  learning: number;
  due: number;
  fresh: number;
}

export interface VocabularyParseResult {
  data: SheetData;
  wordCount: number;
  source: Exclude<WordSetSource, 'builtin'>;
  warnings: string[];
}
