
import { ValidationResult } from './validationTypes';
import { sanitizeInput } from './sanitization';

/**
 * Vocabulary-specific validation functions
 */

/**
 * Validates vocabulary word input
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
  
  if (!/^[a-zA-Z\s\-'.,!?]+$/.test(sanitized)) {
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
  
  return {
    isValid: errors.length === 0,
    sanitizedValue: sanitized,
    errors
  };
};

/**
 * Validates example input
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
  
  return {
    isValid: errors.length === 0,
    sanitizedValue: sanitized,
    errors
  };
};
