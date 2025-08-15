
import { ValidationResult } from '../validationTypes';
import { sanitizeInput } from '../sanitization';

/**
 * Validates meaning/definition input with content filtering support
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

  const result = {
    isValid: errors.length === 0,
    sanitizedValue: sanitized,
    errors
  };

  console.log('[MEANING-VALIDATION] Validation result:', result);
  return result;
};
