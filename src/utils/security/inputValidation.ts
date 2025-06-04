
/**
 * Input validation utilities for security
 */

// XSS prevention patterns
const XSS_PATTERNS = [
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
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /(--|\#|\/\*|\*\/)/g,
  /(\b(OR|AND)\b.*[=<>])/gi,
  /['"]\s*(OR|AND)\s*['"]/gi
];

// File upload validation
const ALLOWED_FILE_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.json'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue?: string;
  errors: string[];
}

/**
 * Sanitizes input by removing potentially dangerous content
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  let sanitized = input;
  
  // Remove XSS patterns
  XSS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Remove SQL injection patterns
  SQL_INJECTION_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Remove null bytes and control characters
  sanitized = sanitized.replace(/\x00/g, '');
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Trim and normalize whitespace
  sanitized = sanitized.trim().replace(/\s+/g, ' ');
  
  return sanitized;
};

/**
 * Validates vocabulary word input
 */
export const validateVocabularyWord = (word: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!word || typeof word !== 'string') {
    errors.push('Word is required');
    return { isValid: false, errors };
  }
  
  const sanitized = sanitizeInput(word);
  
  if (sanitized.length === 0) {
    errors.push('Word cannot be empty after sanitization');
  }
  
  if (sanitized.length > 100) {
    errors.push('Word must be less than 100 characters');
  }
  
  if (!/^[a-zA-Z\s\-'.,!?]+$/.test(sanitized)) {
    errors.push('Word contains invalid characters');
  }
  
  return {
    isValid: errors.length === 0,
    sanitizedValue: sanitized,
    errors
  };
};

/**
 * Validates meaning/definition input
 */
export const validateMeaning = (meaning: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!meaning || typeof meaning !== 'string') {
    errors.push('Meaning is required');
    return { isValid: false, errors };
  }
  
  const sanitized = sanitizeInput(meaning);
  
  if (sanitized.length === 0) {
    errors.push('Meaning cannot be empty after sanitization');
  }
  
  if (sanitized.length > 500) {
    errors.push('Meaning must be less than 500 characters');
  }
  
  return {
    isValid: errors.length === 0,
    sanitizedValue: sanitized,
    errors
  };
};

/**
 * Validates example input
 */
export const validateExample = (example: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!example || typeof example !== 'string') {
    errors.push('Example is required');
    return { isValid: false, errors };
  }
  
  const sanitized = sanitizeInput(example);
  
  if (sanitized.length === 0) {
    errors.push('Example cannot be empty after sanitization');
  }
  
  if (sanitized.length > 1000) {
    errors.push('Example must be less than 1000 characters');
  }
  
  return {
    isValid: errors.length === 0,
    sanitizedValue: sanitized,
    errors
  };
};

/**
 * Validates file upload
 */
export const validateFileUpload = (file: File): ValidationResult => {
  const errors: string[] = [];
  
  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors };
  }
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
  
  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
    errors.push(`File type not allowed. Allowed types: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`);
  }
  
  // Check filename for suspicious patterns
  if (/[<>:"|?*]/.test(file.name)) {
    errors.push('Filename contains invalid characters');
  }
  
  if (file.name.length > 255) {
    errors.push('Filename is too long');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Rate limiting utility
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  
  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    
    // Remove old attempts outside the time window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(identifier, recentAttempts);
    
    return true;
  }
  
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}
