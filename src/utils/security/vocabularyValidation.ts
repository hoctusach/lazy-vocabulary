
import { ValidationResult } from './validationTypes';
import { sanitizeInput } from './sanitization';

/**
 * Vocabulary-specific validation functions
 */

/**
 * Validates vocabulary word input
 * Updated to allow common grammatical notation characters
 */
export const validateVocabularyWord = (word: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!word || typeof word !== 'string') {
    errors.push('Word is required');
    return { isValid: false, errors };
  }
  
  const sanitized = sanitizeInput(word);
  
  if (sanitized.length === 0) {
    errors.push('Word cannot be empty after sanitization');
  }
  
  if (sanitized.length > 100) {
    errors.push('Word must be less than 100 characters');
  }
  
  // Updated regex to allow common grammatical notation:
  // - Square brackets for grammatical info: [intransitive], [countable]
  // - Parentheses for usage info: (with somebody), (formal)
  // - Forward slashes for pronunciation or alternatives: /ˈwɔːtər/, word/phrase
  // - Tilde for approximate meanings: ~something
  // - Basic punctuation and accented characters
  if (!/^[a-zA-Z\s\-'.,!?()[\]/~àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ]+$/.test(sanitized)) {
    errors.push('Word contains invalid characters');
  }
  
  return {
    isValid: errors.length === 0,
    sanitizedValue: sanitized,
    errors
  };
};

/**
 * Validates meaning/definition input
 * Updated to allow grammatical notation and special characters commonly found in definitions
 */
export const validateMeaning = (meaning: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!meaning || typeof meaning !== 'string') {
    errors.push('Meaning is required');
    return { isValid: false, errors };
  }
  
  const sanitized = sanitizeInput(meaning);
  
  if (sanitized.length === 0) {
    errors.push('Meaning cannot be empty after sanitization');
  }
  
  if (sanitized.length > 500) {
    errors.push('Meaning must be less than 500 characters');
  }
  
  // Allow broader range of characters for definitions including:
  // - Grammatical notation: [intransitive], (formal)
  // - Special punctuation: semicolons, colons, quotes
  // - Numbers and basic symbols
  if (!/^[a-zA-Z0-9\s\-'.,!?;:()[\]/~""`àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ]+$/.test(sanitized)) {
    errors.push('Meaning contains invalid characters');
  }
  
  return {
    isValid: errors.length === 0,
    sanitizedValue: sanitized,
    errors
  };
};

/**
 * Validates example input
 * Most permissive validation for example sentences
 */
export const validateExample = (example: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!example || typeof example !== 'string') {
    errors.push('Example is required');
    return { isValid: false, errors };
  }
  
  const sanitized = sanitizeInput(example);
  
  if (sanitized.length === 0) {
    errors.push('Example cannot be empty after sanitization');
  }
  
  if (sanitized.length > 1000) {
    errors.push('Example must be less than 1000 characters');
  }
  
  // Most permissive for examples - allow almost all printable characters
  // except dangerous HTML/script characters (handled by sanitization)
  if (!/^[a-zA-Z0-9\s\-'.,!?;:()[\]/~""`àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ%&*+=@#$^_|\\{}]+$/.test(sanitized)) {
    errors.push('Example contains invalid characters');
  }
  
  return {
    isValid: errors.length === 0,
    sanitizedValue: sanitized,
    errors
  };
};
