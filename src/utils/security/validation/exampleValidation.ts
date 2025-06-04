
import { ValidationResult, VOCABULARY_CHAR_CLASS } from '../validationTypes';
import { sanitizeInput } from '../sanitization';
import { shouldBypassValidation } from '../../text/contentFilters';

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
  
  // Check if content should bypass validation
  if (shouldBypassValidation(example)) {
    console.log('[EXAMPLE-VALIDATION] Content contains IPA/Vietnamese, bypassing character validation');
    
    const sanitized = sanitizeInput(example);
    
    if (sanitized.length === 0) {
      errors.push('Example cannot be empty after sanitization');
    }
    
    if (sanitized.length > 1000) {
      errors.push('Example must be less than 1000 characters');
    }
    
    const result = {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors
    };
    
    console.log('[EXAMPLE-VALIDATION] Bypass validation result:', result);
    return result;
  }
  
  // Standard validation path
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
