import type { LearningProgress, DailySelection } from '@/types/learning';

export type LastWordMap = Record<string, string>;

export interface TodayLastWord {
  date: string;
  index: number;
  word: string;
  category?: string;
}

export type LearningProgressMap = Record<string, LearningProgress>;

export type LearningTimeRecord = Record<string, number>;

export interface WordCountEntry {
  word: string;
  count: number;
  lastShown: string;
}

export type WordCountMap = Record<string, WordCountEntry>;

export type { DailySelection };
