import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildQuiz, buildQuizQuestion } from '@/features/quiz/quizEngine';
import { evaluatePracticeSentence } from '@/features/practice/ruleEngine';
import type { PracticeMetadata } from '@/features/practice/types';
import type { VocabularyWord } from '@/types/vocabulary';

const w = (word: string, meaning: string, category = 'c'): VocabularyWord => ({
  word, meaning, example: '', count: 0, category,
});

describe('QUIZ-03: quiz engine', () => {
  const pool100 = Array.from({ length: 100 }, (_, i) => w(`word${i}`, `meaning ${i}`, i % 2 ? 'odd' : 'even'));

  it('pool of 2: one distractor, so only two options', () => {
    const q = buildQuizQuestion(w('a', 'alpha'), [w('a', 'alpha'), w('b', 'beta')])!;
    expect(q.options).toHaveLength(2);
    expect(q.options).toContain('alpha');
  });

  it('pool of 4: four unique options including the answer', () => {
    const pool = ['a', 'b', 'c', 'd'].map((x) => w(x, `m-${x}`));
    const q = buildQuizQuestion(pool[0], pool)!;
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options).toContain('m-a');
  });

  it('pool of 100: options stay unique and prefer the same category', () => {
    for (let i = 0; i < 20; i += 1) {
      const target = pool100[i];
      const q = buildQuizQuestion(target, pool100)!;
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(target.meaning);
      const sameCategory = new Set(pool100.filter((x) => x.category === target.category).map((x) => x.meaning));
      expect(q.options.every((o) => sameCategory.has(o))).toBe(true);
    }
  });

  it('never makes a question without a distractor, and skips blank-meaning targets', () => {
    expect(buildQuizQuestion(w('solo', 'only'), [w('solo', 'only')])).toBeNull();
    expect(buildQuizQuestion(w('x', '   '), pool100)).toBeNull();
    expect(buildQuiz([w('x', ''), w('y', '  ')], pool100)).toEqual([]);
  });

  it('does not offer a distractor with the same meaning as the answer', () => {
    const pool = [w('a', 'Same'), w('b', 'same'), w('c', 'other')];
    const q = buildQuizQuestion(pool[0], pool)!;
    expect(q.options.filter((o) => o.toLowerCase() === 'same')).toHaveLength(1);
  });

  it('buildQuiz returns at most N unique words', () => {
    const quiz = buildQuiz(pool100, pool100, 5);
    expect(quiz).toHaveLength(5);
    expect(new Set(quiz.map((q) => q.word)).size).toBe(5);
  });
});

describe('PRACT-03: practice rule engine', () => {
  const metadata: PracticeMetadata = {
    lemma: 'improve',
    wordForms: ['improve', 'improves', 'improved', 'improving'],
    collocations: ['improve English'],
    semanticTags: ['learning'],
    semanticKeywords: ['english', 'skill'],
    minimumSentenceLength: 5,
  };

  it('a good sentence scores 80+ with the strong-practice summary', () => {
    const r = evaluatePracticeSentence('I improved my English skill every day.', metadata);
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.feedback[0]).toMatch(/^Strong practice sentence/);
  });

  it('a failed required rule caps the score at 69', () => {
    const noTarget = evaluatePracticeSentence('I study my English skill every day.', metadata);
    expect(noTarget.score).toBeLessThanOrEqual(69);
    const tooShort = evaluatePracticeSentence('Improve.', metadata);
    expect(tooShort.score).toBeLessThanOrEqual(69);
    expect(tooShort.failedRules.length).toBeGreaterThan(0);
  });

  it('repeating the same word does not earn full marks', () => {
    const r = evaluatePracticeSentence('Improve improve improve improve improve improve.', metadata);
    expect(r.score).toBeLessThan(80);
  });
});

describe('REG-04: theme contrast (WCAG AA)', () => {
  const script = '/workspace/theme-shots/check_contrast.mjs';
  it.skipIf(!existsSync(script))('check_contrast.mjs passes for every theme', () => {
    const out = execFileSync(process.execPath, [script], { encoding: 'utf8' });
    expect(out).toContain('ALL PASS');
  });
});
