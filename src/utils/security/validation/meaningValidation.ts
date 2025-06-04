
import { ValidationResult, VOCABULARY_CHAR_CLASS } from '../validationTypes';
import { sanitizeInput } from '../sanitization';
import { shouldBypassValidation } from '../../text/contentFilters';

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
  
  // Check if content should bypass validation
  if (shouldBypassValidation(meaning)) {
    console.log('[MEANING-VALIDATION] Content contains IPA/Vietnamese, bypassing character validation');
    
    const sanitized = sanitizeInput(meaning);
    
    if (sanitized.length === 0) {
      errors.push('Meaning cannot be empty after sanitization');
    }
    
    if (sanitized.length > 500) {
      errors.push('Meaning must be less than 500 characters');
    }
    
    const result = {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors
    };
    
    console.log('[MEANING-VALIDATION] Bypass validation result:', result);
    return result;
  }
  
  // Standard validation path
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
