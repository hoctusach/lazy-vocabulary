import { describe, expect, it } from 'vitest';
import { evaluatePracticeSentence } from '@/features/practice/ruleEngine';
import type { PracticeMetadata } from '@/features/practice/types';

const metadata: PracticeMetadata = {
  lemma: 'improve',
  wordForms: ['improve', 'improves', 'improved', 'improving'],
  collocations: ['improve English'],
  semanticTags: ['learning'],
  semanticKeywords: ['english', 'skill'],
  minimumSentenceLength: 5,
};

describe('evaluatePracticeSentence', () => {
  it('rewards a complete sentence that uses an accepted target form', () => {
    const result = evaluatePracticeSentence('I improved my English skill every day.', metadata);

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.failedRules.map((rule) => rule.id)).not.toContain('target-word-exists');
    expect(result.passedRules.map((rule) => rule.id)).toContain('semantic-match');
  });

  it('caps score when required target word rule fails', () => {
    const result = evaluatePracticeSentence('I study my English skill every day.', metadata);

    expect(result.score).toBeLessThanOrEqual(69);
    expect(result.failedRules.map((rule) => rule.id)).toContain('target-word-exists');
  });
});
