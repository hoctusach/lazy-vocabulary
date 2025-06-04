
/**
 * Common types and interfaces for validation
 */

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue?: string;
  errors: string[];
}

// XSS prevention patterns
export const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<link/gi,
  /<meta/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
  /expression\s*\(/gi
];

// SQL injection patterns
export const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /(--|\#|\/\*|\*\/)/g,
  /(\b(OR|AND)\b.*[=<>])/gi,
  /['"]\s*(OR|AND)\s*['"]/gi
];

// File upload validation constants
export const ALLOWED_FILE_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.json'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
