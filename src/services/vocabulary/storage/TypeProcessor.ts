
import { SheetData, VocabularyWord } from "@/types/vocabulary";
import { sanitizeInput, validateVocabularyWord, validateMeaning, validateExample } from "@/utils/security/inputValidation";
import { WordValidator } from "./WordValidator";

/**
 * Handles type processing and sanitization for vocabulary data
 * Updated with comprehensive validation logging and error handling
 */
export class TypeProcessor {
  private wordValidator = new WordValidator();

  /**
   * Ensures all fields in the data have the correct types and are sanitized
   */
  ensureDataTypes(data: any): SheetData {
    const processedData: SheetData = {};
    
    console.log('[TYPE-PROCESSOR] Starting comprehensive data processing');
    
    for (const sheetName in data) {
      // Sanitize sheet name
      const sanitizedSheetName = sanitizeInput(sheetName);
      processedData[sanitizedSheetName] = [];
      
      console.log(`[TYPE-PROCESSOR] Processing sheet: ${sheetName} (${data[sheetName]?.length || 0} words)`);
      
      if (Array.isArray(data[sheetName])) {
        for (let i = 0; i < data[sheetName].length; i++) {
          const word = data[sheetName][i];
          
          // Skip invalid word objects
          if (!word || typeof word !== 'object') {
            console.warn(`[TYPE-PROCESSOR] Skipping invalid word object at index ${i}:`, word);
            continue;
          }
          
          // Log the original word for debugging
          console.log(`[TYPE-PROCESSOR] Processing word ${i + 1}: "${word.word}"`);
          
          // Validate and sanitize each field with detailed logging
          const wordValidation = validateVocabularyWord(String(word.word || ""));
          const meaningValidation = validateMeaning(String(word.meaning || ""));
          const exampleValidation = validateExample(String(word.example || ""));
          
          // Detailed validation logging
          if (!wordValidation.isValid) {
            console.warn(`[TYPE-PROCESSOR] Word validation failed for "${word.word}":`, {
              originalWord: word.word,
              sanitizedWord: wordValidation.sanitizedValue,
              errors: wordValidation.errors
            });
          }
          if (!meaningValidation.isValid) {
            console.warn(`[TYPE-PROCESSOR] Meaning validation failed for "${word.word}":`, {
              originalMeaning: word.meaning,
              sanitizedMeaning: meaningValidation.sanitizedValue,
              errors: meaningValidation.errors
            });
          }
          if (!exampleValidation.isValid) {
            console.warn(`[TYPE-PROCESSOR] Example validation failed for "${word.word}":`, {
              originalExample: word.example,
              sanitizedExample: exampleValidation.sanitizedValue,
              errors: exampleValidation.errors
            });
          }
          
          // Include words that pass validation OR provide detailed error information
          if (wordValidation.isValid && meaningValidation.isValid && exampleValidation.isValid) {
            const processedWord: VocabularyWord = {
              word: wordValidation.sanitizedValue!,
              meaning: meaningValidation.sanitizedValue!,
              example: exampleValidation.sanitizedValue!,
              count: this.wordValidator.sanitizeCount(word.count),
              category: sanitizeInput(String(word.category || sanitizedSheetName))
            };
            
            processedData[sanitizedSheetName].push(processedWord);
            console.log(`[TYPE-PROCESSOR] ✅ Successfully processed: "${processedWord.word}"`);
          } else {
            // Provide detailed information about why the word was rejected
            console.error(`[TYPE-PROCESSOR] ❌ Rejecting word "${word.word}" due to validation failures:`, {
              originalWord: {
                word: word.word,
                meaning: word.meaning,
                example: word.example,
                category: word.category
              },
              validationResults: {
                word: {
                  isValid: wordValidation.isValid,
                  sanitized: wordValidation.sanitizedValue,
                  errors: wordValidation.errors
                },
                meaning: {
                  isValid: meaningValidation.isValid,
                  sanitized: meaningValidation.sanitizedValue,
                  errors: meaningValidation.errors
                },
                example: {
                  isValid: exampleValidation.isValid,
                  sanitized: exampleValidation.sanitizedValue,
                  errors: exampleValidation.errors
                }
              }
            });
          }
        }
      }
      
      console.log(`[TYPE-PROCESSOR] Sheet "${sanitizedSheetName}" processing complete: ${processedData[sanitizedSheetName].length} valid words out of ${data[sheetName]?.length || 0} total`);
    }
    
    console.log('[TYPE-PROCESSOR] Comprehensive data processing complete');
    console.log('[TYPE-PROCESSOR] Final result:', Object.keys(processedData).map(sheetName => `${sheetName}: ${processedData[sheetName].length} words`));
    
    return processedData;
  }
}
