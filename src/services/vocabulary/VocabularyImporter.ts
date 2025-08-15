
import { SheetData, VocabularyWord } from "@/types/vocabulary";
import { VocabularyStorage } from "../vocabularyStorage";
import { VocabularyDataProcessor } from "./VocabularyDataProcessor";

export class VocabularyImporter {
  private storage: VocabularyStorage;
  private dataProcessor: VocabularyDataProcessor;
  
  constructor(storage: VocabularyStorage) {
    this.storage = storage;
    this.dataProcessor = new VocabularyDataProcessor();
  }
  
  mergeImportedData(importedData: SheetData, targetData: SheetData): void {
    console.log("Merging imported data with existing data");
    
    // Go through each sheet in the imported data
    for (const sheetName in importedData) {
      // Skip "All words" if it exists in imported data
      if (sheetName === "All words") {
        console.log('Skipping "All words" sheet during import');
        continue;
      }
      
      if (!targetData[sheetName]) {
        // If sheet doesn't exist yet, create it
        targetData[sheetName] = [];
      }
      
      // Track duplicates for logging
      let updatedWords = 0;
      let newWords = 0;
      
      // For each word in the imported sheet
      for (const importedWord of importedData[sheetName]) {
        // Skip empty words
        if (!importedWord.word || importedWord.word.trim() === "") continue;
        
        // Ensure all fields are properly typed and add default category if missing
        const processedWord: VocabularyWord = {
          word: String(importedWord.word),
          meaning: String(importedWord.meaning || ""),
          example: String(importedWord.example || ""),
          translation: String(importedWord.translation || ""),
          count: importedWord.count !== undefined ? importedWord.count : 0,
          category: importedWord.category || sheetName // Use sheet name as default category if not provided
        };
        
        // Check if the word already exists (case-insensitive)
        const existingWordIndex = targetData[sheetName].findIndex(
          existingWord => existingWord.word.toLowerCase() === processedWord.word.toLowerCase()
        );
        
        if (existingWordIndex >= 0) {
          // Update existing word
          targetData[sheetName][existingWordIndex] = {
            ...processedWord,
            // Preserve count if it's higher in the existing record
            count: this.dataProcessor.getHigherCount(
              processedWord.count, 
              targetData[sheetName][existingWordIndex].count
            ),
            // Preserve existing category if present
            category: targetData[sheetName][existingWordIndex].category || processedWord.category
          };
          updatedWords++;
        } else {
          // Add new word
          targetData[sheetName].push(processedWord);
          newWords++;
        }
      }
      
      console.log(`Sheet "${sheetName}": ${newWords} new words, ${updatedWords} updated words`);
    }
    
    console.log("Merged data complete:", 
      Object.keys(targetData).map(key => `${key}: ${targetData[key].length} words`).join(", "));
  }
}
