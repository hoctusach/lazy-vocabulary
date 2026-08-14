import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildQuizQuestion, buildQuiz, pickWordOfTheDay } from '@/features/quiz/quizEngine';
import type { VocabularyWord } from '@/types/vocabulary';

function word(overrides: Partial<VocabularyWord> = {}): VocabularyWord {
  return {
    word: 'placeholder',
    meaning: 'a placeholder meaning',
    example: 'This is a placeholder example.',
    count: 0,
    category: 'idioms',
    ...overrides,
  };
}

describe('buildQuizQuestion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when the pool has no usable distractors', () => {
    const target = word({ word: 'lonely', meaning: 'the only word' });
    expect(buildQuizQuestion(target, [target])).toBeNull();
  });

  it('always includes the correct meaning among the options', () => {
    const target = word({ word: 'knuckle down', meaning: 'work hard', category: 'phrasal verbs' });
    const pool = [
      target,
      word({ word: 'get around to', meaning: 'finally do something', category: 'phrasal verbs' }),
      word({ word: 'cook the books', meaning: 'falsify records', category: 'phrasal verbs' }),
      word({ word: 'under house arrest', meaning: 'confined at home', category: 'phrasal verbs' }),
    ];

    const question = buildQuizQuestion(target, pool);

    expect(question).not.toBeNull();
    expect(question!.options).toContain('work hard');
    expect(question!.correctMeaning).toBe('work hard');
  });

  it('never produces duplicate options', () => {
    const target = word({ word: 'a', meaning: 'shared meaning', category: 'idioms' });
    const pool = [
      target,
      word({ word: 'b', meaning: 'shared meaning', category: 'idioms' }), // duplicate meaning, should be skipped
      word({ word: 'c', meaning: 'unique meaning c', category: 'idioms' }),
      word({ word: 'd', meaning: 'unique meaning d', category: 'idioms' }),
    ];

    const question = buildQuizQuestion(target, pool);

    expect(question).not.toBeNull();
    const unique = new Set(question!.options);
    expect(unique.size).toBe(question!.options.length);
  });

  it('caps distractors at distractorCount', () => {
    const target = word({ word: 'a', meaning: 'meaning a', category: 'idioms' });
    const pool = [
      target,
      word({ word: 'b', meaning: 'meaning b', category: 'idioms' }),
      word({ word: 'c', meaning: 'meaning c', category: 'idioms' }),
      word({ word: 'd', meaning: 'meaning d', category: 'idioms' }),
      word({ word: 'e', meaning: 'meaning e', category: 'idioms' }),
    ];

    const question = buildQuizQuestion(target, pool, 2);

    expect(question).not.toBeNull();
    expect(question!.options).toHaveLength(3); // 1 correct + 2 distractors
  });

  it('prefers same-category distractors over other categories', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // disable shuffling effects on order selection

    const target = word({ word: 'a', meaning: 'meaning a', category: 'idioms' });
    const pool = [
      target,
      word({ word: 'other-cat', meaning: 'meaning other', category: 'grammar' }),
      word({ word: 'same-cat', meaning: 'meaning same', category: 'idioms' }),
    ];

    const question = buildQuizQuestion(target, pool, 1);

    expect(question!.options).toContain('meaning same');
    expect(question!.options).not.toContain('meaning other');
  });
});

describe('buildQuiz', () => {
  it('builds up to questionCount questions without repeating a target word', () => {
    const pool: VocabularyWord[] = Array.from({ length: 10 }, (_, i) =>
      word({ word: `word-${i}`, meaning: `meaning ${i}`, category: 'idioms' }),
    );

    const quiz = buildQuiz(pool, pool, 5);

    expect(quiz.length).toBeLessThanOrEqual(5);
    const words = quiz.map((q) => q.word);
    expect(new Set(words).size).toBe(words.length);
  });

  it('falls back to the pool when targets is empty', () => {
    const pool: VocabularyWord[] = Array.from({ length: 6 }, (_, i) =>
      word({ word: `word-${i}`, meaning: `meaning ${i}`, category: 'idioms' }),
    );

    const quiz = buildQuiz([], pool, 3);
    expect(quiz.length).toBeGreaterThan(0);
  });

  it('returns an empty array when there is nothing to build questions from', () => {
    expect(buildQuiz([], [], 5)).toEqual([]);
  });
});

describe('pickWordOfTheDay', () => {
  it('returns null for an empty pool', () => {
    expect(pickWordOfTheDay([], '2024-06-15')).toBeNull();
  });

  it('is deterministic for the same date and pool', () => {
    const pool = Array.from({ length: 5 }, (_, i) => word({ word: `word-${i}` }));
    const first = pickWordOfTheDay(pool, '2024-06-15');
    const second = pickWordOfTheDay(pool, '2024-06-15');
    expect(first).toEqual(second);
  });

  it('can pick different words on different dates', () => {
    const pool = Array.from({ length: 30 }, (_, i) => word({ word: `word-${i}` }));
    const picks = new Set(
      ['2024-06-01', '2024-06-02', '2024-06-03', '2024-06-04', '2024-06-05'].map(
        (d) => pickWordOfTheDay(pool, d)?.word,
      ),
    );
    expect(picks.size).toBeGreaterThan(1);
  });
});
