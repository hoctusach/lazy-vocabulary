
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
    
    // Make sure "All words" contains everything from other sheets
    this.regenerateAllWordsSheet(targetData);
    
    console.log("Merged data complete:", 
      Object.keys(targetData).map(key => `${key}: ${targetData[key].length} words`).join(", "));
  }
  
  private regenerateAllWordsSheet(data: SheetData): void {
    // Create a map to track unique words by lowercase word
    const allWordsMap = new Map<string, VocabularyWord>();
    
    // Add existing "All words" first
    if (data["All words"]) {
      for (const word of data["All words"]) {
        if (word.word && word.word.trim() !== "") {
          // Ensure each word has a category, use "All words" as default
          const wordWithCategory = {
            ...word,
            category: word.category || "All words"
          };
          allWordsMap.set(word.word.toLowerCase(), wordWithCategory);
        }
      }
    }
    
    // Add words from other sheets
    for (const sheetName in data) {
      if (sheetName === "All words") continue;
      
      for (const word of (data[sheetName] || [])) {
        if (!word.word || word.word.trim() === "") continue;
        
        const lowercaseWord = word.word.toLowerCase();
        
        // Ensure the word has a category (use current sheet name if missing)
        const wordWithCategory = {
          ...word,
          category: word.category || sheetName
        };
        
        if (allWordsMap.has(lowercaseWord)) {
          // Update count if higher
          const existingWord = allWordsMap.get(lowercaseWord)!;
          if ((wordWithCategory.count || 0) > (existingWord.count || 0)) {
            existingWord.count = wordWithCategory.count;
          }
        } else {
          // Add new word
          allWordsMap.set(lowercaseWord, wordWithCategory);
        }
      }
    }
    
    // Convert map back to array
    data["All words"] = Array.from(allWordsMap.values());
    console.log(`Regenerated "All words" sheet with ${data["All words"].length} total words`);
  }
}
