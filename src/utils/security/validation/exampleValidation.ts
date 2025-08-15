
import { ValidationResult } from '../validationTypes';
import { sanitizeInput } from '../sanitization';

/**
 * Validates example input with content filtering support
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

  const result = {
    isValid: errors.length === 0,
    sanitizedValue: sanitized,
    errors
  };

  console.log('[EXAMPLE-VALIDATION] Validation result:', result);
  return result;
};
