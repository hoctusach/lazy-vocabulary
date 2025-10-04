
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
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/\x00/g, '');
  
  // Only remove the most dangerous control characters, preserve others that might be linguistic
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Be much more selective about HTML entities - only remove clearly dangerous ones
  // Preserve entities that might be legitimate linguistic notation
  sanitized = sanitized.replace(/&(?!amp;|lt;|gt;|quot;|#39;|#x27;|#8217;|#8216;|#8220;|#8221;|#\d+;|#x[0-9a-fA-F]+;)[^;]+;/g, '');
  
  // Normalize whitespace but preserve structure - be gentler
  sanitized = sanitized.trim().replace(/\s+/g, ' ');
  
  console.log('[SANITIZATION] Output after sanitization:', sanitized);
  
  return sanitized;
};

