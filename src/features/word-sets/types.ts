import type { SheetData, VocabularyWord } from '@/types/vocabulary';

/** Built-in vocabulary. Progress for this set keeps the existing account sync. */
export const DEFAULT_SET_ID = 'default';

export const DEFAULT_SET_NAME = 'Word Set: C1, C2';

export interface VocabularySetMeta {
  id: string;
  name: string;
  builtin: boolean;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  fileName?: string;
  /** Created by hand on this device (free), not imported from a file. */
  manual?: boolean;
}

export interface LearnedWordEntry {
  word: string;
  category: string;
  reviewCount: number;
  learnedAt: string;
  lastReviewAt: string;
  nextReviewAt: string;
}

/** A card the learner has seen, before they mark it learned. */
export interface LearningWordEntry {
  word: string;
  category: string;
  seenAt: string;
}

export interface SetProgressState {
  learned: Record<string, LearnedWordEntry>;
  learning?: Record<string, LearningWordEntry>;
  todayDate?: string;
  todayKeys?: string[];
}

export interface ImportParseSuccess {
  ok: true;
  nameSuggestion: string;
  sheets: SheetData;
  wordCount: number;
  warnings: string[];
}

export interface ImportParseFailure {
  ok: false;
  errors: string[];
}

export type ImportParseResult = ImportParseSuccess | ImportParseFailure;

export interface ImportSource {
  fileName: string;
  /** Decoded text for CSV and JSON. */
  text?: string;
  /** Raw bytes for Excel workbooks. */
  data?: ArrayBuffer | Uint8Array;
}

export type WordRow = VocabularyWord;
