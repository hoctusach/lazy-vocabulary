
import { validateVocabularyWord, validateMeaning, validateExample } from "@/utils/security/inputValidation";
import { VocabularyWord } from "@/types/vocabulary";
import { VALIDATION_LIMITS } from "./constants";

/**
 * Handles validation of individual vocabulary word objects
 */
export class WordValidator {
  /**
   * Validates a single word object
   */
  validateWordObject(
    word: Partial<Record<keyof VocabularyWord, unknown>>,
    sheetName: string,
    index: number
  ): string[] {
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
      if (isNaN(count) || count < 0 || count > VALIDATION_LIMITS.MAX_COUNT) {
        errors.push(`${prefix} Invalid count value`);
      }
    }
    
    return errors;
  }

  /**
   * Sanitizes count values
   */
  sanitizeCount(count: number | string | null | undefined): number {
    if (count === undefined || count === null) {
      return 0;
    }
    
    const numCount = Number(count);
    if (isNaN(numCount) || numCount < 0) {
      return 0;
    }
    
    // Cap count at reasonable maximum
    return Math.min(numCount, VALIDATION_LIMITS.MAX_COUNT);
  }
}
