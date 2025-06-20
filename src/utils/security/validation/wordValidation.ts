
import { ValidationResult } from '../validationTypes';
import { sanitizeInput } from '../sanitization';

/**
 * Validates vocabulary word input with content filtering support
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

  const result = {
    isValid: errors.length === 0,
    sanitizedValue: sanitized,
    errors
  };

  console.log('[WORD-VALIDATION] Validation result:', result);
  return result;
};
