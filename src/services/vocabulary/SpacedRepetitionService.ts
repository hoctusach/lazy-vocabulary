
import { VocabularyWord, SheetData } from "@/types/vocabulary";
import { initializeSpacedRepetitionFields } from "@/utils/spacedScheduler";

export class SpacedRepetitionService {
  /**
   * Migrates vocabulary data to include spaced repetition fields
   */
  migrateVocabularyData(data: SheetData): SheetData {
    const migratedData: SheetData = {};
    
    for (const category in data) {
      migratedData[category] = data[category].map(word => initializeSpacedRepetitionFields(word));
    }
    
    return migratedData;
  }
  
  /**
   * Updates a specific word in the vocabulary data
   */
  updateWordInData(data: SheetData, updatedWord: VocabularyWord): SheetData {
    const result: SheetData = { ...data };
    
    // Try to find the word in its category
    const category = updatedWord.category || Object.keys(data)[0];
    
    if (result[category]) {
      const index = result[category].findIndex(w => 
        w.word === updatedWord.word && 
        (w.category === updatedWord.category || (!w.category && !updatedWord.category))
      );
      
      if (index !== -1) {
        // Replace the word with the updated version
        result[category] = [
          ...result[category].slice(0, index),
          updatedWord,
          ...result[category].slice(index + 1)
        ];
      } else {
        // If not found, add it
        result[category] = [...result[category], updatedWord];
      }
    } else if (category) {
      // Create the category if it doesn't exist
      result[category] = [updatedWord];
    }
    
    return result;
  }
}

export const spacedRepetitionService = new SpacedRepetitionService();
