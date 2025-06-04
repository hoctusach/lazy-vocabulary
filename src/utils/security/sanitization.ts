
import { XSS_PATTERNS, SQL_INJECTION_PATTERNS } from './validationTypes';

/**
 * Input sanitization utilities
 * Updated to preserve valid grammatical notation characters
 */

/**
 * Sanitizes input by removing potentially dangerous content while preserving valid characters
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  let sanitized = input;
  
  // Remove XSS patterns (but preserve legitimate brackets and parentheses)
  XSS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Remove SQL injection patterns
  SQL_INJECTION_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Remove null bytes and most control characters
  // But preserve common whitespace characters (space, tab, newline)
  sanitized = sanitized.replace(/\x00/g, '');
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Remove potentially dangerous HTML entities but preserve safe ones
  sanitized = sanitized.replace(/&(?!amp;|lt;|gt;|quot;|#39;)[^;]+;/g, '');
  
  // Normalize whitespace but preserve structure
  sanitized = sanitized.trim().replace(/\s+/g, ' ');
  
  return sanitized;
};

/**
 * More conservative sanitization for user input fields
 * Use this for form inputs where you want to be extra careful
 */
export const sanitizeUserInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove all HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>]/g, '');
  
  // Apply standard sanitization
  return sanitizeInput(sanitized);
};
