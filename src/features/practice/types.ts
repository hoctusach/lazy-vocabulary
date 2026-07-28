import type { VocabularyWord } from '@/types/vocabulary';

export type PracticeRuleId =
  | 'target-word-exists'
  | 'correct-word-form'
  | 'complete-sentence'
  | 'minimum-length'
  | 'basic-grammar'
  | 'collocation-bonus'
  | 'semantic-match';

export interface PracticeMetadata {
  lemma: string;
  wordForms: string[];
  partOfSpeech?: string;
  collocations: string[];
  semanticTags: string[];
  semanticKeywords: string[];
  minimumSentenceLength: number;
}

export interface PracticeRuleConfig {
  id: PracticeRuleId;
  label: string;
  enabled: boolean;
  required?: boolean;
  bonus?: boolean;
  weight: number;
}

export interface PracticeRuleOutcome {
  id: PracticeRuleId;
  label: string;
  passed: boolean;
  points: number;
  feedback: string;
}

export interface PracticeEvaluationResult {
  score: number;
  feedback: string[];
  passedRules: PracticeRuleOutcome[];
  failedRules: PracticeRuleOutcome[];
  allRules: PracticeRuleOutcome[];
}

export interface PracticeAttempt {
  id: string;
  word: Pick<VocabularyWord, 'word' | 'meaning' | 'example' | 'category'>;
  transcript: string;
  result: PracticeEvaluationResult;
  createdAt: string;
}
