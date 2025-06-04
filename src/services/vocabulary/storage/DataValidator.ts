
import { SheetData } from "@/types/vocabulary";
import { DEFAULT_VOCABULARY_DATA } from "@/data/defaultVocabulary";
import { sanitizeInput, validateVocabularyWord, validateMeaning, validateExample } from "@/utils/security/inputValidation";

/**
 * Handles data validation and type checking for vocabulary data with security enhancements
 */
export class DataValidator {
  private readonly MAX_WORDS_PER_SHEET = 10000;
  private readonly MAX_TOTAL_WORDS = 50000;
  
  /**
   * Validates the size of data against the maximum storage limit
   */
  validateDataSize(data: string, maxSize: number): boolean {
    return data.length <= maxSize;
  }

  /**
   * Validates and sanitizes vocabulary data for security
   */
  validateVocabularyData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data || typeof data !== 'object') {
      errors.push('Invalid data format');
      return { isValid: false, errors };
    }
    
    let totalWords = 0;
    
    for (const sheetName in data) {
      // Validate sheet name
      const sanitizedSheetName = sanitizeInput(sheetName);
      if (sanitizedSheetName !== sheetName) {
        errors.push(`Invalid characters in sheet name: ${sheetName}`);
      }
      
      if (!Array.isArray(data[sheetName])) {
        errors.push(`Sheet "${sheetName}" is not a valid array`);
        continue;
      }
      
      const sheetWords = data[sheetName];
      
      // Check sheet size limits
      if (sheetWords.length > this.MAX_WORDS_PER_SHEET) {
        errors.push(`Sheet "${sheetName}" exceeds maximum word limit of ${this.MAX_WORDS_PER_SHEET}`);
      }
      
      totalWords += sheetWords.length;
      
      // Validate each word in the sheet
      for (let i = 0; i < sheetWords.length; i++) {
        const word = sheetWords[i];
        const wordErrors = this.validateWordObject(word, sheetName, i);
        errors.push(...wordErrors);
      }
    }
    
    // Check total words limit
    if (totalWords > this.MAX_TOTAL_WORDS) {
      errors.push(`Total words exceed maximum limit of ${this.MAX_TOTAL_WORDS}`);
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * Validates a single word object
   */
  private validateWordObject(word: any, sheetName: string, index: number): string[] {
    const errors: string[] = [];
    const prefix = `Sheet "${sheetName}", word ${index + 1}:`;
    
    if (!word || typeof word !== 'object') {
      errors.push(`${prefix} Invalid word object`);
      return errors;
    }
    
    // Validate word field
    if (word.word) {
      const wordValidation = validateVocabularyWord(String(word.word));
      if (!wordValidation.isValid) {
        errors.push(`${prefix} ${wordValidation.errors.join(', ')}`);
      }
    }
    
    // Validate meaning field
    if (word.meaning) {
      const meaningValidation = validateMeaning(String(word.meaning));
      if (!meaningValidation.isValid) {
        errors.push(`${prefix} Meaning - ${meaningValidation.errors.join(', ')}`);
      }
    }
    
    // Validate example field
    if (word.example) {
      const exampleValidation = validateExample(String(word.example));
      if (!exampleValidation.isValid) {
        errors.push(`${prefix} Example - ${exampleValidation.errors.join(', ')}`);
      }
    }
    
    // Validate count field
    if (word.count !== undefined && word.count !== null) {
      const count = Number(word.count);
      if (isNaN(count) || count < 0 || count > 1000000) {
        errors.push(`${prefix} Invalid count value`);
      }
    }
    
    return errors;
  }

  /**
   * Ensures all fields in the data have the correct types and are sanitized
   */
  ensureDataTypes(data: any): SheetData {
    const processedData: SheetData = {};
    
    for (const sheetName in data) {
      // Sanitize sheet name
      const sanitizedSheetName = sanitizeInput(sheetName);
      processedData[sanitizedSheetName] = [];
      
      if (Array.isArray(data[sheetName])) {
        for (const word of data[sheetName]) {
          // Skip invalid word objects
          if (!word || typeof word !== 'object') {
            console.warn('Skipping invalid word object:', word);
            continue;
          }
          
          // Validate and sanitize each field
          const wordValidation = validateVocabularyWord(String(word.word || ""));
          const meaningValidation = validateMeaning(String(word.meaning || ""));
          const exampleValidation = validateExample(String(word.example || ""));
          
          // Only include words that pass validation
          if (wordValidation.isValid && meaningValidation.isValid && exampleValidation.isValid) {
            const processedWord = {
              word: wordValidation.sanitizedValue!,
              meaning: meaningValidation.sanitizedValue!,
              example: exampleValidation.sanitizedValue!,
              count: this.sanitizeCount(word.count),
              category: sanitizeInput(String(word.category || sanitizedSheetName))
            };
            
            processedData[sanitizedSheetName].push(processedWord);
          } else {
            console.warn('Skipping word that failed validation:', {
              word: word.word,
              errors: [
                ...wordValidation.errors,
                ...meaningValidation.errors,
                ...exampleValidation.errors
              ]
            });
          }
        }
      }
    }
    
    return processedData;
  }
  
  /**
   * Sanitizes count values
   */
  private sanitizeCount(count: any): number {
    if (count === undefined || count === null) {
      return 0;
    }
    
    const numCount = Number(count);
    if (isNaN(numCount) || numCount < 0) {
      return 0;
    }
    
    // Cap count at reasonable maximum
    return Math.min(numCount, 1000000);
  }

  /**
   * Returns default vocabulary data when other data is invalid
   */
  getDefaultData(): SheetData {
    return this.ensureDataTypes(DEFAULT_VOCABULARY_DATA);
  }
  
  /**
   * Validates imported data before processing
   */
  validateImportedData(data: any): { isValid: boolean; processedData?: SheetData; errors: string[] } {
    const validation = this.validateVocabularyData(data);
    
    if (!validation.isValid) {
      return { isValid: false, errors: validation.errors };
    }
    
    try {
      const processedData = this.ensureDataTypes(data);
      return { isValid: true, processedData, errors: [] };
    } catch (error) {
      return { 
        isValid: false, 
        errors: [`Failed to process data: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }
}
