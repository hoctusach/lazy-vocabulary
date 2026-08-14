import type { VocabularyWord } from '@/types/vocabulary';
import type { QuizQuestion } from './types';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeMeaning(meaning: string): string {
  return meaning.trim().toLowerCase();
}

/**
 * Builds one multiple-choice question for `target`, picking wrong-answer
 * meanings from `pool` — same-category words first so distractors stay
 * plausible, rather than being obviously random.
 */
export function buildQuizQuestion(
  target: VocabularyWord,
  pool: VocabularyWord[],
  distractorCount = 3,
): QuizQuestion | null {
  const targetMeaning = target?.meaning?.trim();
  if (!target?.word || !targetMeaning) return null;

  const seenMeanings = new Set([normalizeMeaning(targetMeaning)]);

  const sameCategory: VocabularyWord[] = [];
  const otherCategory: VocabularyWord[] = [];
  for (const candidate of pool) {
    if (candidate.word === target.word || !candidate.meaning?.trim()) continue;
    if (candidate.category && candidate.category === target.category) {
      sameCategory.push(candidate);
    } else {
      otherCategory.push(candidate);
    }
  }

  const distractors: string[] = [];
  for (const candidate of [...shuffle(sameCategory), ...shuffle(otherCategory)]) {
    const normalized = normalizeMeaning(candidate.meaning);
    if (seenMeanings.has(normalized)) continue;
    seenMeanings.add(normalized);
    distractors.push(candidate.meaning.trim());
    if (distractors.length >= distractorCount) break;
  }

  if (distractors.length === 0) return null;

  return {
    id: `${target.word}::${target.category ?? ''}`,
    word: target.word,
    example: target.example,
    correctMeaning: targetMeaning,
    options: shuffle([targetMeaning, ...distractors]),
  };
}

/**
 * Builds up to `questionCount` questions, preferring `targets` (e.g. today's
 * due/new words) as the words being quizzed, with `pool` supplying distractor
 * meanings. Falls back to `pool` itself for targets when `targets` is empty.
 */
export function buildQuiz(
  targets: VocabularyWord[],
  pool: VocabularyWord[],
  questionCount = 5,
  distractorCount = 3,
): QuizQuestion[] {
  const candidates = targets.length > 0 ? targets : pool;
  const questions: QuizQuestion[] = [];
  const usedWords = new Set<string>();

  for (const candidate of shuffle(candidates)) {
    if (questions.length >= questionCount) break;
    if (usedWords.has(candidate.word)) continue;
    const question = buildQuizQuestion(candidate, pool, distractorCount);
    if (!question) continue;
    usedWords.add(candidate.word);
    questions.push(question);
  }

  return questions;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Deterministic by calendar day, so everyone sees the same word on a given date. */
export function pickWordOfTheDay(
  pool: VocabularyWord[],
  dateKey: string = new Date().toISOString().slice(0, 10),
): VocabularyWord | null {
  if (pool.length === 0) return null;
  const index = hashString(dateKey) % pool.length;
  return pool[index];
}
