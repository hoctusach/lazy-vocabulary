import { describe, expect, it } from 'vitest';
import { buildPracticeMetadata, tokenizePracticeText } from '@/features/practice/metadata';
import { evaluatePracticeSentence } from '@/features/practice/ruleEngine';
import type { VocabularyWord } from '@/types/vocabulary';

const vw = (word: string, meaning = 'to stop trying', example = 'Do not give up easily.'): VocabularyWord => ({
  word,
  meaning,
  example,
  count: 0,
  category: 'phrasal verbs',
});

describe('metadata (I8)', () => {
  it('uses the first word of a phrase as the lemma', () => {
    expect(buildPracticeMetadata(vw('give up')).lemma).toBe('give');
    expect(buildPracticeMetadata(vw('give up (verb)')).lemma).toBe('give');
  });

  it('derives regular forms', () => {
    const forms = buildPracticeMetadata(vw('walk')).wordForms;
    expect(forms).toEqual(expect.arrayContaining(['walk', 'walks', 'walked', 'walking']));
  });

  it('handles -y and -e endings', () => {
    expect(buildPracticeMetadata(vw('study')).wordForms).toEqual(expect.arrayContaining(['studies', 'studied', 'studying']));
    expect(buildPracticeMetadata(vw('make')).wordForms).toEqual(expect.arrayContaining(['making']));
    expect(buildPracticeMetadata(vw('play')).wordForms).toEqual(expect.arrayContaining(['plays', 'played']));
  });

  it('does not know irregular forms (documented limitation, I9)', () => {
    expect(buildPracticeMetadata(vw('run')).wordForms).not.toContain('ran');
  });

  it('keeps meaningful keywords only, at most 12', () => {
    const keywords = buildPracticeMetadata(vw('x', 'a long description about something important and meaningful today', '')).semanticKeywords;
    expect(keywords.length).toBeLessThanOrEqual(12);
    expect(keywords).not.toContain('about');
  });

  it('tokenizes apostrophes and ignores symbols', () => {
    expect(tokenizePracticeText("I don't give up!")).toEqual(['i', "don't", 'give', 'up']);
    expect(tokenizePracticeText('')).toEqual([]);
  });
});

describe('evaluating a sentence (I10, I11)', () => {
  const meta = buildPracticeMetadata(vw('give up'));

  it('rewards a complete sentence that uses the word', () => {
    const result = evaluatePracticeSentence('I decided to give up smoking trying today.', meta);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.failedRules.filter((r) => r.id === 'target-word-exists')).toHaveLength(0);
  });

  it('accepts another form of the word', () => {
    const result = evaluatePracticeSentence('She was giving up on the long project today.', meta);
    expect(result.passedRules.map((r) => r.id)).toContain('correct-word-form');
  });

  it('caps the score at 69 when a required rule fails (no target word)', () => {
    const result = evaluatePracticeSentence('I decided to leave the long project today.', meta);
    expect(result.score).toBeLessThanOrEqual(69);
  });

  it('handles an empty transcript', () => {
    const result = evaluatePracticeSentence('', meta);
    expect(result.score).toBeLessThanOrEqual(69);
    expect(result.failedRules.length).toBeGreaterThan(0);
    expect(result.feedback.length).toBeGreaterThan(0);
  });

  it('flags repeated words in the grammar rule', () => {
    const result = evaluatePracticeSentence('I I decided to give up smoking today.', meta);
    expect(result.failedRules.map((r) => r.id)).toContain('basic-grammar');
  });

  it('too short a sentence fails the length rule', () => {
    const result = evaluatePracticeSentence('I give up.', meta);
    expect(result.failedRules.map((r) => r.id)).toContain('minimum-length');
  });

  it('never exceeds 100 even with the collocation bonus', () => {
    const withCollocation = { ...meta, collocations: ['give up'] };
    expect(evaluatePracticeSentence('I decided to give up smoking trying today.', withCollocation).score).toBeLessThanOrEqual(100);
  });

  it('does not crash on text that is not Latin (it is tokenized into fragments)', () => {
    expect(() => evaluatePracticeSentence('Tôi muốn bỏ cuộc vì quá mệt', meta)).not.toThrow();
    expect(evaluatePracticeSentence('Tôi muốn bỏ cuộc vì quá mệt', meta).score).toBeLessThanOrEqual(69);
  });
});
