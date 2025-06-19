
/**
 * Common types and interfaces for validation
 * Updated with more precise XSS patterns that preserve linguistic notation
 */

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue?: string;
  errors: string[];
}

// XSS prevention patterns - made more specific to avoid interfering with linguistic notation
export const XSS_PATTERNS = [
  // Script tags (case insensitive)
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  // JavaScript protocols
  /javascript\s*:/gi,
  // Event handlers (on* attributes) - more specific
  /\s+on\w+\s*=\s*["'][^"']*["']/gi,
  /\s+on\w+\s*=\s*[^>\s]+/gi,
  // Dangerous HTML elements
  /<iframe\b[^>]*>/gi,
  /<object\b[^>]*>/gi,
  /<embed\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /<meta\b[^>]*>/gi,
  /<style\b[^>]*>/gi,
  // Data URLs with HTML/JavaScript content
  /data:\s*text\/html/gi,
  /data:\s*application\/javascript/gi,
  // VBScript
  /vbscript\s*:/gi,
  // CSS expressions
  /expression\s*\(/gi,
  // Form elements (to prevent form injection)
  /<form\b[^>]*>/gi,
  /<input\b[^>]*>/gi,
  /<button\b[^>]*>/gi,
  /<textarea\b[^>]*>/gi,
  // Comment-based attacks
  /<!--[\s\S]*?-->/g,
  // Base64 encoded scripts
  /data:\s*[^;]+;base64,/gi
];

// SQL injection patterns - kept conservative but more precise
export const SQL_INJECTION_PATTERNS = [
  // SQL keywords with clear attack patterns (case-insensitive, word boundaries)
  /\b(SELECT\s+\*\s+FROM|INSERT\s+INTO|UPDATE\s+.*\s+SET|DELETE\s+FROM|DROP\s+TABLE|CREATE\s+TABLE|ALTER\s+TABLE|EXEC|UNION\s+SELECT)\b/gi,
  // SQL comment indicators at start of injection attempts
  /^\s*(--|#|\/\*)/g,
  /;\s*(--|#|\/\*)/g,
  // Clear injection patterns
  /'\s*(OR|AND)\s+.*[=<>]/gi,
  /"\s*(OR|AND)\s+.*[=<>]/gi,
  // Semicolon-based command separation with dangerous keywords
  /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)/gi,
  // Classic injection patterns
  /'\s*OR\s+'?1'?\s*='?1/gi,
  /'\s*OR\s+'?true'?\s*--/gi,
  // UNION injection attempts
  /UNION\s+(ALL\s+)?SELECT/gi
];

// File upload validation constants
export const ALLOWED_FILE_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.json'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Valid characters for vocabulary notation - comprehensive Unicode ranges
export const VOCABULARY_CHAR_RANGES = [
  // Basic Latin and Latin-1 Supplement
  '\\u0020-\\u007E',  // Basic Latin printable
  '\\u00A0-\\u00FF',  // Latin-1 Supplement
  
  // Extended Latin
  '\\u0100-\\u017F',  // Latin Extended-A
  '\\u0180-\\u024F',  // Latin Extended-B
  '\\u1E00-\\u1EFF',  // Latin Extended Additional
  
  // IPA Extensions and Phonetic Extensions
  '\\u0250-\\u02AF',  // IPA Extensions
  '\\u1D00-\\u1D7F',  // Phonetic Extensions
  '\\u1D80-\\u1DBF',  // Phonetic Extensions Supplement
  
  // Combining Diacritical Marks
  '\\u0300-\\u036F',  // Combining Diacritical Marks
  '\\u1AB0-\\u1AFF',  // Combining Diacritical Marks Extended
  '\\u1DC0-\\u1DFF',  // Combining Diacritical Marks Supplement
  
  // Spacing Modifier Letters
  '\\u02B0-\\u02FF',  // Spacing Modifier Letters
  
  // General Punctuation (includes smart quotes)
  '\\u2000-\\u206F',  // General Punctuation
  
  // Currency and Mathematical symbols
  '\\u20A0-\\u20CF',  // Currency Symbols
  '\\u2100-\\u214F',  // Letterlike Symbols
  '\\u2190-\\u21FF',  // Arrows
  '\\u2200-\\u22FF',  // Mathematical Operators
  '\\u2300-\\u23FF',  // Miscellaneous Technical
  
  // Additional symbols commonly used in linguistics
  '\\u25A0-\\u25FF',  // Geometric Shapes
  '\\u2600-\\u26FF',  // Miscellaneous Symbols
];

// Create the comprehensive character class for vocabulary validation
export const VOCABULARY_CHAR_CLASS = `[${VOCABULARY_CHAR_RANGES.join('')}]`;
