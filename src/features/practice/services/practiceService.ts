import type { VocabularyWord } from '@/types/vocabulary';
import { buildPracticeMetadata, defaultPracticeRules } from '../metadata';
import { evaluatePracticeSentence } from '../ruleEngine';
import { savePracticeAttempt } from '../storage';
import type { PracticeAttempt, PracticeEvaluationResult } from '../types';

export interface PracticeSubmission {
  word: VocabularyWord;
  transcript: string;
  now?: Date;
}

const createAttemptId = (word: string, createdAt: string): string => {
  const safeWord = word.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${Date.parse(createdAt)}-${safeWord || 'word'}`;
};

export function evaluateAndSavePractice({ word, transcript, now = new Date() }: PracticeSubmission): PracticeAttempt {
  const metadata = buildPracticeMetadata(word);
  const result: PracticeEvaluationResult = evaluatePracticeSentence(transcript, metadata, defaultPracticeRules);
  const createdAt = now.toISOString();
  const attempt: PracticeAttempt = {
    id: createAttemptId(word.word, createdAt),
    word: {
      word: word.word,
      meaning: word.meaning,
      example: word.example,
      category: word.category,
    },
    transcript: transcript.trim(),
    result,
    createdAt,
  };
  savePracticeAttempt(attempt);
  return attempt;
}
