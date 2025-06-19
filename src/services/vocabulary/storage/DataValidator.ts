
import { SheetData, VocabularyWord } from "@/types/vocabulary";
import { DEFAULT_VOCABULARY_DATA } from "@/data/defaultVocabulary";
import { sanitizeInput } from "@/utils/security/inputValidation";
import { VALIDATION_LIMITS } from "./constants";
import { WordValidator } from "./WordValidator";
import { TypeProcessor } from "./TypeProcessor";

/**
 * Handles data validation and type checking for vocabulary data with security enhancements
 */
export class DataValidator {
  private readonly wordValidator = new WordValidator();
  private readonly typeProcessor = new TypeProcessor();
  
  /**
   * Validates the size of data against the maximum storage limit
   */
  validateDataSize(data: string, maxSize: number): boolean {
    return data.length <= maxSize;
  }

  /**
   * Validates and sanitizes vocabulary data for security
   */
  validateVocabularyData(data: unknown): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data || typeof data !== 'object') {
      errors.push('Invalid data format');
      return { isValid: false, errors };
    }
    
    let totalWords = 0;
    
    const sheets = data as Record<string, unknown>;

    for (const sheetName in sheets) {
      // Validate sheet name
      const sanitizedSheetName = sanitizeInput(sheetName);
      if (sanitizedSheetName !== sheetName) {
        errors.push(`Invalid characters in sheet name: ${sheetName}`);
      }
      
      const sheet = sheets[sheetName];

      if (!Array.isArray(sheet)) {
        errors.push(`Sheet "${sheetName}" is not a valid array`);
        continue;
      }

      const sheetWords = sheet as Array<
        Partial<Record<keyof VocabularyWord, unknown>>
      >;
      
      // Check sheet size limits
      if (sheetWords.length > VALIDATION_LIMITS.MAX_WORDS_PER_SHEET) {
        errors.push(`Sheet "${sheetName}" exceeds maximum word limit of ${VALIDATION_LIMITS.MAX_WORDS_PER_SHEET}`);
      }
      
      totalWords += sheetWords.length;
      
      // Validate each word in the sheet
      for (let i = 0; i < sheetWords.length; i++) {
        const word = sheetWords[i];
        const wordErrors = this.wordValidator.validateWordObject(word, sheetName, i);
        errors.push(...wordErrors);
      }
    }
    
    // Check total words limit
    if (totalWords > VALIDATION_LIMITS.MAX_TOTAL_WORDS) {
      errors.push(`Total words exceed maximum limit of ${VALIDATION_LIMITS.MAX_TOTAL_WORDS}`);
    }
    
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Ensures all fields in the data have the correct types and are sanitized
   */
  ensureDataTypes(data: Record<string, Array<Record<string, unknown>>>): SheetData {
    return this.typeProcessor.ensureDataTypes(data);
  }

  /**
   * Returns default vocabulary data when other data is invalid
   */
  getDefaultData(): SheetData {
    // Convert DEFAULT_VOCABULARY_DATA to the expected format for ensureDataTypes
    const convertedData: Record<string, Array<Record<string, unknown>>> = {};
    for (const [sheetName, words] of Object.entries(DEFAULT_VOCABULARY_DATA)) {
      convertedData[sheetName] = words.map(word => ({
        word: word.word,
        meaning: word.meaning,
        example: word.example,
        count: word.count,
        category: word.category
      }));
    }
    return this.ensureDataTypes(convertedData);
  }
  
  /**
   * Validates imported data before processing
   */
  validateImportedData(
    data: Record<string, Array<Record<string, unknown>>>
  ): { isValid: boolean; processedData?: SheetData; errors: string[] } {
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
