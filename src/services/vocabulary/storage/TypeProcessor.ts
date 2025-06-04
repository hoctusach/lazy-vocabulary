
import { SheetData, VocabularyWord } from "@/types/vocabulary";
import { sanitizeInput, validateVocabularyWord, validateMeaning, validateExample } from "@/utils/security/inputValidation";
import { WordValidator } from "./WordValidator";

/**
 * Handles type processing and sanitization for vocabulary data
 * Updated with better debugging and error handling
 */
export class TypeProcessor {
  private wordValidator = new WordValidator();

  /**
   * Ensures all fields in the data have the correct types and are sanitized
   */
  ensureDataTypes(data: any): SheetData {
    const processedData: SheetData = {};
    
    console.log('[TYPE-PROCESSOR] Starting data processing');
    
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
          
          // Validate and sanitize each field
          const wordValidation = validateVocabularyWord(String(word.word || ""));
          const meaningValidation = validateMeaning(String(word.meaning || ""));
          const exampleValidation = validateExample(String(word.example || ""));
          
          // Log validation results
          if (!wordValidation.isValid) {
            console.warn(`[TYPE-PROCESSOR] Word validation failed for "${word.word}":`, wordValidation.errors);
          }
          if (!meaningValidation.isValid) {
            console.warn(`[TYPE-PROCESSOR] Meaning validation failed for "${word.word}":`, meaningValidation.errors);
          }
          if (!exampleValidation.isValid) {
            console.warn(`[TYPE-PROCESSOR] Example validation failed for "${word.word}":`, exampleValidation.errors);
          }
          
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
            console.log(`[TYPE-PROCESSOR] Successfully processed: "${processedWord.word}"`);
          } else {
            console.warn(`[TYPE-PROCESSOR] Skipping word "${word.word}" due to validation failures:`, {
              word: word.word,
              wordErrors: wordValidation.errors,
              meaningErrors: meaningValidation.errors,
              exampleErrors: exampleValidation.errors
            });
          }
        }
      }
      
      console.log(`[TYPE-PROCESSOR] Sheet "${sanitizedSheetName}" processed: ${processedData[sanitizedSheetName].length} valid words`);
    }
    
    console.log('[TYPE-PROCESSOR] Data processing complete');
    return processedData;
  }
}
