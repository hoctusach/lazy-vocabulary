import { describe, it, expect } from 'vitest';
import { validateVocabularyWord, validateMeaning, validateExample } from '../src/utils/security/validation';
import { VALIDATION_LIMITS } from '../src/services/vocabulary/storage/constants';

// Representative tests for vocabulary validation utilities

describe('validateVocabularyWord', () => {
  it('accepts simple words', () => {
    const result = validateVocabularyWord('water');
    expect(result.isValid).toBe(true);
  });

  it('accepts words with IPA notation', () => {
    const result = validateVocabularyWord('beautiful /ˈbjuːtɪfəl/');
    expect(result.isValid).toBe(true);
  });

  it('rejects malicious input', () => {
    const result = validateVocabularyWord('<script>alert(1)</script>');
    expect(result.isValid).toBe(false);
  });
});

describe('validateMeaning', () => {
  it('accepts normal meanings', () => {
    const result = validateMeaning('to stop working or functioning');
    expect(result.isValid).toBe(true);
  });

  it('accepts meanings with pronunciation', () => {
    const result = validateMeaning('pronounced /ˈwɔːtər/ in American English');
    expect(result.isValid).toBe(true);
  });

  it('sanitizes SQL keywords and remains valid', () => {
    const result = validateMeaning('SELECT * FROM users');
    expect(result.isValid).toBe(true);
    expect(result.sanitizedValue).toBe('users');
  });

  it('rejects meanings that exceed the configured length', () => {
    const longMeaning = 'x'.repeat(VALIDATION_LIMITS.MAX_MEANING_LENGTH + 1);
    const result = validateMeaning(longMeaning);
    expect(result.isValid).toBe(false);
  });
});

describe('validateExample', () => {
  it('accepts normal examples', () => {
    const result = validateExample('The car broke down on the highway.');
    expect(result.isValid).toBe(true);
  });

  it('accepts examples with stress marks', () => {
    const result = validateExample('Stress pattern: ˈbeautiful (primary stress on first syllable)');
    expect(result.isValid).toBe(true);
  });

  it('rejects form tags', () => {
    const result = validateExample('<form action="evil.com">');
    expect(result.isValid).toBe(false);
  });
});
