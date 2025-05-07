import { SheetData } from "@/types/vocabulary";
import { DEFAULT_VOCABULARY_DATA } from "@/data/defaultVocabulary";

/**
 * Handles data validation and type checking for vocabulary data
 */
export class DataValidator {
  /**
   * Validates the size of data against the maximum storage limit
   */
  validateDataSize(data: string, maxSize: number): boolean {
    return data.length <= maxSize;
  }

  /**
   * Ensures all fields in the data have the correct types
   */
  ensureDataTypes(data: any): SheetData {
    const processedData: SheetData = {};
    
    for (const sheetName in data) {
      processedData[sheetName] = [];
      
      if (Array.isArray(data[sheetName])) {
        for (const word of data[sheetName]) {
          // Create a properly typed word object, handling both number and string count values
          const processedWord = {
            word: String(word.word || ""),
            meaning: String(word.meaning || ""),
            example: String(word.example || ""),
            // Keep count as is if it's already a number or string
            count: word.count !== undefined ? word.count : 0
          };
          
          processedData[sheetName].push(processedWord);
        }
      }
    }
    
    return processedData;
  }

  /**
   * Returns default vocabulary data when other data is invalid
   */
  getDefaultData(): SheetData {
    return this.ensureDataTypes(DEFAULT_VOCABULARY_DATA);
  }
}
