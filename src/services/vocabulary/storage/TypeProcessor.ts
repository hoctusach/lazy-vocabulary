
import { SheetData, VocabularyWord } from "@/types/vocabulary";
import { sanitizeInput, validateVocabularyWord, validateMeaning, validateExample } from "@/utils/security/inputValidation";
import { shouldBypassValidation, prepareTextForDisplay } from "@/utils/text/contentFilters";
import { WordValidator } from "./WordValidator";

interface RawWord {
  word?: unknown;
  meaning?: unknown;
  example?: unknown;
  count?: unknown;
  category?: unknown;
}

/**
 * Handles type processing and sanitization for vocabulary data
 * Updated with IPA notation and Vietnamese content filtering support
 */
export class TypeProcessor {
  private wordValidator = new WordValidator();

  /**
   * Ensures all fields in the data have the correct types and are sanitized
   * Now includes content filtering for IPA notation and Vietnamese text
   */
  ensureDataTypes(
    data: Record<string, Array<Record<string, unknown>>>
  ): SheetData {
    const processedData: SheetData = {};
    
    console.log('[TYPE-PROCESSOR] Starting comprehensive data processing with content filtering');
    
    for (const sheetName in data) {
      // Sanitize sheet name
      const sanitizedSheetName = sanitizeInput(sheetName);
      processedData[sanitizedSheetName] = [];
      
      console.log(`[TYPE-PROCESSOR] Processing sheet: ${sheetName} (${data[sheetName]?.length || 0} words)`);
      
      const sheet = data[sheetName];
      if (Array.isArray(sheet)) {
        for (let i = 0; i < sheet.length; i++) {
          const word = sheet[i] as RawWord;
          
          // Skip invalid word objects
          if (!word || typeof word !== 'object') {
            console.warn(`[TYPE-PROCESSOR] Skipping invalid word object at index ${i}:`, word);
            continue;
          }
          
          // Log the original word for debugging
          console.log(`[TYPE-PROCESSOR] Processing word ${i + 1}: "${word.word}"`);
          
          // Check if any field contains IPA or Vietnamese content
          const wordText = String(word.word || "");
          const meaningText = String(word.meaning || "");
          const exampleText = String(word.example || "");
          
          const containsSpecialContent = shouldBypassValidation(wordText) || 
                                       shouldBypassValidation(meaningText) || 
                                       shouldBypassValidation(exampleText);
          
          if (containsSpecialContent) {
            console.log(`[TYPE-PROCESSOR] Word "${wordText}" contains IPA/Vietnamese content, using bypass validation`);
          }
          
          // Validate and sanitize each field with enhanced logging
          const wordValidation = validateVocabularyWord(wordText);
          const meaningValidation = validateMeaning(meaningText);
          const exampleValidation = validateExample(exampleText);
          
          // Detailed validation logging
          if (!wordValidation.isValid) {
            console.warn(`[TYPE-PROCESSOR] Word validation failed for "${word.word}":`, {
              originalWord: word.word,
              sanitizedWord: wordValidation.sanitizedValue,
              errors: wordValidation.errors,
              containsSpecialContent
            });
          }
          if (!meaningValidation.isValid) {
            console.warn(`[TYPE-PROCESSOR] Meaning validation failed for "${word.word}":`, {
              originalMeaning: word.meaning,
              sanitizedMeaning: meaningValidation.sanitizedValue,
              errors: meaningValidation.errors,
              containsSpecialContent
            });
          }
          if (!exampleValidation.isValid) {
            console.warn(`[TYPE-PROCESSOR] Example validation failed for "${word.word}":`, {
              originalExample: word.example,
              sanitizedExample: exampleValidation.sanitizedValue,
              errors: exampleValidation.errors,
              containsSpecialContent
            });
          }
          
          // Include words that pass validation OR provide detailed error information
          if (wordValidation.isValid && meaningValidation.isValid && exampleValidation.isValid) {
            const processedWord: VocabularyWord = {
              word: prepareTextForDisplay(wordValidation.sanitizedValue!),
              meaning: prepareTextForDisplay(meaningValidation.sanitizedValue!),
              example: prepareTextForDisplay(exampleValidation.sanitizedValue!),
              count: this.wordValidator.sanitizeCount(String(word.count || 0)),
              category: sanitizeInput(String(word.category || sanitizedSheetName))
            };
            
            processedData[sanitizedSheetName].push(processedWord);
            console.log(`[TYPE-PROCESSOR] ✅ Successfully processed: "${processedWord.word}"`);
            
            if (containsSpecialContent) {
              console.log(`[TYPE-PROCESSOR] 🔤 Word contains IPA/Vietnamese content; speech will include it as-is`);
            }
          } else {
            // Provide detailed information about why the word was rejected
            console.error(`[TYPE-PROCESSOR] ❌ Rejecting word "${word.word}" due to validation failures:`, {
              originalWord: {
                word: word.word,
                meaning: word.meaning,
                example: word.example,
                category: word.category
              },
              contentAnalysis: {
                containsSpecialContent,
                wordHasSpecial: shouldBypassValidation(wordText),
                meaningHasSpecial: shouldBypassValidation(meaningText),
                exampleHasSpecial: shouldBypassValidation(exampleText)
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
    
    console.log('[TYPE-PROCESSOR] Comprehensive data processing with content filtering complete');
    console.log('[TYPE-PROCESSOR] Final result:', Object.keys(processedData).map(sheetName => `${sheetName}: ${processedData[sheetName].length} words`));
    
    return processedData;
  }
}
