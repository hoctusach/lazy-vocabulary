export interface LearningProgress {
  word: string;
  type?: string;
  category: string;
  isLearned: boolean;
  reviewCount: number;
  lastPlayedDate: string;
  status: 'due' | 'not_due' | 'new' | 'learned';
  nextReviewDate: string;
  createdDate: string;
  learnedDate?: string;
  nextAllowedTime?: string;
  isDue?: boolean;
}

export type DailyMode = 'Light' | 'Medium' | 'Hard';

export interface DailySelection {
  newWords: LearningProgress[];
  reviewWords: LearningProgress[];
  totalCount: number;
  dueCount?: number;
  severity: SeverityLevel;
  date?: string;
  mode?: DailyMode;
  count?: number;
  category?: string | null;
  timezone?: string | null;
}

export type SeverityLevel = 'light' | 'moderate' | 'intense';

export interface SeverityConfig {
  light: { min: number; max: number };
  moderate: { min: number; max: number };
  intense: { min: number; max: number };
}

export interface CategoryWeights {
  'phrasal verbs': number;
  'idioms': number;
  'topic vocab': number;
  'grammar': number;
  'phrases, collocations': number;
  'word formation': number;
}
