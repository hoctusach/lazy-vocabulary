
import { ValidationResult, VOCABULARY_CHAR_CLASS } from '../validationTypes';
import { sanitizeInput } from '../sanitization';
import { shouldBypassValidation, hasValidSpeechableContent } from '../../text/contentFilters';

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
  
  // Check if content should bypass validation
  if (shouldBypassValidation(word)) {
    console.log('[WORD-VALIDATION] Content contains IPA/Vietnamese, bypassing character validation');
    
    // Still apply basic sanitization but skip character validation
    const sanitized = sanitizeInput(word);
    
    if (sanitized.length === 0) {
      errors.push('Word cannot be empty after sanitization');
    }
    
    if (sanitized.length > 100) {
      errors.push('Word must be less than 100 characters');
    }
    
    // Check if there's any speechable content remaining
    if (!hasValidSpeechableContent(sanitized)) {
      console.log('[WORD-VALIDATION] Warning: No speechable content after filtering');
      // This is just a warning, not an error - allow the word to pass
    }
    
    const result = {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors
    };
    
    console.log('[WORD-VALIDATION] Bypass validation result:', result);
    return result;
  }
  
  // Standard validation path for regular content
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
