
import { ValidationResult, VOCABULARY_CHAR_CLASS } from './validationTypes';
import { sanitizeInput } from './sanitization';

/**
 * Vocabulary-specific validation functions
 * Updated with comprehensive support for linguistic notation and IPA symbols
 */

/**
 * Validates vocabulary word input
 * Updated to allow extensive grammatical notation, IPA symbols, and linguistic characters
 */
export const validateVocabularyWord = (word: string): ValidationResult => {
  const errors: string[] = [];
  
  console.log('[WORD-VALIDATION] Starting validation for word:', word);
  
  if (!word || typeof word !== 'string') {
    errors.push('Word is required');
    return { isValid: false, errors };
  }
  
  const sanitized = sanitizeInput(word);
  console.log('[WORD-VALIDATION] After sanitization:', sanitized);
  
  if (sanitized.length === 0) {
    errors.push('Word cannot be empty after sanitization');
  }
  
  if (sanitized.length > 100) {
    errors.push('Word must be less than 100 characters');
  }
  
  // Use the comprehensive character class that includes Unicode ranges
  const wordPattern = new RegExp(`^${VOCABULARY_CHAR_CLASS}+$`);
  
  if (!wordPattern.test(sanitized)) {
    // Get the invalid characters for debugging
    const invalidChars = sanitized.split('').filter(char => !wordPattern.test(char));
    console.log('[WORD-VALIDATION] Character validation failed for:', sanitized);
    console.log('[WORD-VALIDATION] Invalid characters found:', invalidChars);
    errors.push(`Word contains unsupported characters: ${invalidChars.join(', ')}`);
  }
  
  const result = {
    isValid: errors.length === 0,
    sanitizedValue: sanitized,
    errors
  };
  
  console.log('[WORD-VALIDATION] Validation result:', result);
  return result;
};

/**
 * Validates meaning/definition input
 * Updated to allow comprehensive linguistic notation
 */
export const validateMeaning = (meaning: string): ValidationResult => {
  const errors: string[] = [];
  
  console.log('[MEANING-VALIDATION] Starting validation for meaning:', meaning);
  
  if (!meaning || typeof meaning !== 'string') {
    errors.push('Meaning is required');
    return { isValid: false, errors };
  }
  
  const sanitized = sanitizeInput(meaning);
  console.log('[MEANING-VALIDATION] After sanitization:', sanitized);
  
  if (sanitized.length === 0) {
    errors.push('Meaning cannot be empty after sanitization');
  }
  
  if (sanitized.length > 500) {
    errors.push('Meaning must be less than 500 characters');
  }
  
  // Use the comprehensive character class for meanings as well
  const meaningPattern = new RegExp(`^${VOCABULARY_CHAR_CLASS}+$`);
  
  if (!meaningPattern.test(sanitized)) {
    const invalidChars = sanitized.split('').filter(char => !meaningPattern.test(char));
    console.log('[MEANING-VALIDATION] Character validation failed for:', sanitized);
    console.log('[MEANING-VALIDATION] Invalid characters found:', invalidChars);
    errors.push(`Meaning contains unsupported characters: ${invalidChars.join(', ')}`);
  }
  
  const result = {
    isValid: errors.length === 0,
    sanitizedValue: sanitized,
    errors
  };
  
  console.log('[MEANING-VALIDATION] Validation result:', result);
  return result;
};

/**
 * Validates example input
 * Most permissive validation for example sentences with full linguistic support
 */
export const validateExample = (example: string): ValidationResult => {
  const errors: string[] = [];
  
  console.log('[EXAMPLE-VALIDATION] Starting validation for example:', example);
  
  if (!example || typeof example !== 'string') {
    errors.push('Example is required');
    return { isValid: false, errors };
  }
  
  const sanitized = sanitizeInput(example);
  console.log('[EXAMPLE-VALIDATION] After sanitization:', sanitized);
  
  if (sanitized.length === 0) {
    errors.push('Example cannot be empty after sanitization');
  }
  
  if (sanitized.length > 1000) {
    errors.push('Example must be less than 1000 characters');
  }
  
  // Most permissive for examples - use the same comprehensive character class
  const examplePattern = new RegExp(`^${VOCABULARY_CHAR_CLASS}+$`);
  
  if (!examplePattern.test(sanitized)) {
    const invalidChars = sanitized.split('').filter(char => !examplePattern.test(char));
    console.log('[EXAMPLE-VALIDATION] Character validation failed for:', sanitized);
    console.log('[EXAMPLE-VALIDATION] Invalid characters found:', invalidChars);
    errors.push(`Example contains unsupported characters: ${invalidChars.join(', ')}`);
  }
  
  const result = {
    isValid: errors.length === 0,
    sanitizedValue: sanitized,
    errors
  };
  
  console.log('[EXAMPLE-VALIDATION] Validation result:', result);
  return result;
};
