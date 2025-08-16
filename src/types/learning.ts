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
}

export interface DailySelection {
  newWords: LearningProgress[];
  reviewWords: LearningProgress[];
  totalCount: number;
  severity: SeverityLevel;
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
