
import { ValidationResult, ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE } from './validationTypes';

/**
 * File upload validation utilities
 */

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
