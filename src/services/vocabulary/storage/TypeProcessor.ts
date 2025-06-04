
import { SheetData, VocabularyWord } from "@/types/vocabulary";
import { sanitizeInput, validateVocabularyWord, validateMeaning, validateExample } from "@/utils/security/inputValidation";
import { WordValidator } from "./WordValidator";

/**
 * Handles type processing and sanitization for vocabulary data
 */
export class TypeProcessor {
  private wordValidator = new WordValidator();

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
            const processedWord: VocabularyWord = {
              word: wordValidation.sanitizedValue!,
              meaning: meaningValidation.sanitizedValue!,
              example: exampleValidation.sanitizedValue!,
              count: this.wordValidator.sanitizeCount(word.count),
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
}
