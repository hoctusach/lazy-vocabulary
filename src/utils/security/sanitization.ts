
import { XSS_PATTERNS, SQL_INJECTION_PATTERNS } from './validationTypes';

/**
 * Input sanitization utilities
 * Updated to preserve linguistic notation and IPA symbols while maintaining security
 */

/**
 * Sanitizes input by removing potentially dangerous content while preserving valid linguistic characters
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  console.log('[SANITIZATION] Input received:', input);
  
  let sanitized = input;
  
  // Remove XSS patterns but be more careful about preserving legitimate content
  XSS_PATTERNS.forEach((pattern, index) => {
    const beforeLength = sanitized.length;
    sanitized = sanitized.replace(pattern, '');
    if (beforeLength !== sanitized.length) {
      console.log(`[SANITIZATION] XSS pattern ${index + 1} removed content from:`, input);
    }
  });
  
  // Remove SQL injection patterns but be more selective
  SQL_INJECTION_PATTERNS.forEach((pattern, index) => {
    const beforeLength = sanitized.length;
    sanitized = sanitized.replace(pattern, '');
    if (beforeLength !== sanitized.length) {
      console.log(`[SANITIZATION] SQL pattern ${index + 1} removed content from:`, input);
    }
  });
  
  // Remove null bytes but preserve other characters that might be valid in linguistic notation
  sanitized = sanitized.replace(/\x00/g, '');
  
  // Only remove the most dangerous control characters, preserve others that might be linguistic
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Be more selective about HTML entities - only remove clearly dangerous ones
  // Preserve entities that might be legitimate linguistic notation
  sanitized = sanitized.replace(/&(?!amp;|lt;|gt;|quot;|#39;|#\d+;)[^;]+;/g, '');
  
  // Normalize whitespace but preserve structure - be gentler
  sanitized = sanitized.trim().replace(/\s+/g, ' ');
  
  console.log('[SANITIZATION] Output after sanitization:', sanitized);
  
  return sanitized;
};

/**
 * More conservative sanitization for user input fields
 * Updated to be less aggressive while maintaining security
 */
export const sanitizeUserInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  console.log('[USER-SANITIZATION] Input received:', input);
  
  // Remove HTML tags but be more selective
  let sanitized = input.replace(/<(?!\/?(b|i|em|strong|span)\b)[^>]*>/gi, '');
  
  // Only remove the most dangerous characters, preserve linguistic notation
  sanitized = sanitized.replace(/[<>]/g, '');
  
  // Apply standard sanitization
  const result = sanitizeInput(sanitized);
  
  console.log('[USER-SANITIZATION] Output after sanitization:', result);
  
  return result;
};
