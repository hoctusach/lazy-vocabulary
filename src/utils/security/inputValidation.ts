
/**
 * Main input validation module - re-exports all validation functionality
 * This file maintains backward compatibility while the implementation is now modularized
 */

// Export types and interfaces
export type { ValidationResult } from './validationTypes';
export { 
  XSS_PATTERNS, 
  SQL_INJECTION_PATTERNS, 
  ALLOWED_FILE_EXTENSIONS, 
  MAX_FILE_SIZE 
} from './validationTypes';

// Export sanitization utilities
export { sanitizeInput, sanitizeUserInput } from './sanitization';

// Export vocabulary validation functions from the new modular structure
export { 
  validateVocabularyWord, 
  validateMeaning, 
  validateExample 
} from './validation';

// Export file validation
export { validateFileUpload } from './fileValidation';

// Export rate limiter
export { RateLimiter } from './rateLimiter';

