
/**
 * Common types and interfaces for validation
 * Updated with improved XSS patterns that don't interfere with grammatical notation
 */

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue?: string;
  errors: string[];
}

// XSS prevention patterns - updated to be more specific and not interfere with legitimate brackets
export const XSS_PATTERNS = [
  // Script tags
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  // JavaScript protocols
  /javascript\s*:/gi,
  // Event handlers (on* attributes)
  /\son\w+\s*=/gi,
  // Dangerous HTML elements
  /<iframe[^>]*>/gi,
  /<object[^>]*>/gi,
  /<embed[^>]*>/gi,
  /<link[^>]*>/gi,
  /<meta[^>]*>/gi,
  // Data URLs with HTML content
  /data:text\/html/gi,
  // VBScript
  /vbscript\s*:/gi,
  // CSS expressions
  /expression\s*\(/gi,
  // Form elements (to prevent form injection)
  /<form[^>]*>/gi,
  /<input[^>]*>/gi,
  /<button[^>]*>/gi,
  // Comment-based attacks
  /<!--[\s\S]*?-->/g
];

// SQL injection patterns - kept more conservative
export const SQL_INJECTION_PATTERNS = [
  // SQL keywords (case-insensitive, word boundaries)
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b/gi,
  // SQL comment indicators
  /(--|\#|\/\*|\*\/)/g,
  // Common SQL injection patterns
  /(\b(OR|AND)\b.*[=<>])/gi,
  // Quote-based injections
  /['"]\s*(OR|AND)\s*['"]/gi,
  // Semicolon-based command separation (be careful with this)
  /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP)/gi
];

// File upload validation constants
export const ALLOWED_FILE_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.json'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
