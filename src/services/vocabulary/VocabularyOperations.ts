
import { VocabularyWord } from "@/types/vocabulary";
import { VocabularyDataManager } from "./VocabularyDataManager";
import { VocabularySheetOperations } from "./VocabularySheetOperations";
import { WordNavigation } from "./WordNavigation";

export class VocabularyOperations {
  private dataManager: VocabularyDataManager;
  private sheetOperations: VocabularySheetOperations;
  private wordNavigation: WordNavigation;
  private lastWordChangeTime: number;
  private navigationThrottleRef: { current: number };

  constructor(dataManager: VocabularyDataManager, sheetOperations: VocabularySheetOperations) {
    this.dataManager = dataManager;
    this.sheetOperations = sheetOperations;
    // Reuse the WordNavigation instance managed by VocabularySheetOperations
    this.wordNavigation = sheetOperations.getWordNavigation();
    this.lastWordChangeTime = Date.now();
    this.navigationThrottleRef = { current: 0 };
  }

  async processExcelFile(file: File): Promise<boolean> {
    try {
      console.log("Processing Excel file:", file.name);
      
      // Dynamic import to avoid loading the library unless needed
      const XLSX = await import('xlsx');
      
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      console.log("Available sheets:", workbook.SheetNames);
      
      const importedData: { [key: string]: VocabularyWord[] } = {};
      
      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log(`Processing sheet "${sheetName}" with ${jsonData.length} rows`);
        
        const words: VocabularyWord[] = jsonData.map((row: any, index) => ({
          word: String(row.Word || row.word || '').trim(),
          meaning: String(row.Meaning || row.meaning || '').trim(),
          example: String(row.Example || row.example || '').trim(),
          category: sheetName
        })).filter(word => word.word && word.meaning);
        
        if (words.length > 0) {
          importedData[sheetName] = words;
          console.log(`Successfully processed ${words.length} words from sheet "${sheetName}"`);
        }
      }
      
      if (Object.keys(importedData).length === 0) {
        console.error("No valid data found in any sheets");
        return false;
      }
      
      // Merge with existing data
      this.dataManager.mergeImportedData(importedData);
      this.dataManager.saveData();
      this.sheetOperations.updateWordNavigation();
      
      console.log("Excel file processed successfully");
      return true;
      
    } catch (error) {
      console.error("Error processing Excel file:", error);
      return false;
    }
  }

  getCurrentWord(): VocabularyWord | null {
    const currentSheet = this.sheetOperations.getCurrentSheetName();
    const wordList = this.dataManager.getWordList(currentSheet);
    
    if (wordList.length === 0) {
      console.log("No words available in current sheet");
      return null;
    }
    
    const currentWord = this.wordNavigation.getCurrentWord();
    console.log(`Current word from ${currentSheet}:`, currentWord?.word || 'none');
    
    return currentWord;
  }

  // OPTIMIZED: Prevent excessive processing during navigation
  getNextWord(): VocabularyWord | null {
    const now = Date.now();
    
    // Throttle navigation to prevent excessive calls
    if (now - this.navigationThrottleRef.current < 200) {
      console.log('[VOCAB-OPS] Navigation throttled, returning current word');
      return this.getCurrentWord();
    }
    
    this.navigationThrottleRef.current = now;
    
    const currentSheet = this.sheetOperations.getCurrentSheetName();
    const wordList = this.dataManager.getWordList(currentSheet);
    
    if (wordList.length === 0) {
      console.log('[VOCAB-OPS] No words available for navigation');
      return null;
    }
    
    console.log(`[VOCAB-OPS] Moving to next word in ${currentSheet} (${wordList.length} words available)`);
    
    const nextWord = this.wordNavigation.getNextWord();
    this.lastWordChangeTime = now;
    
    console.log(`[VOCAB-OPS] Next word: ${nextWord?.word || 'none'}`);
    
    // Notify listeners about the word change (not data change)
    this.dataManager.notifyVocabularyChange();
    
    return nextWord;
  }

  getLastWordChangeTime(): number {
    return this.lastWordChangeTime;
  }

  mergeCustomWords(customData: { [key: string]: VocabularyWord[] }): void {
    console.log("Merging custom words with existing data");
    
    // Use the data manager to merge and save
    this.dataManager.mergeImportedData(customData);
    this.dataManager.saveData();
    
    // Update navigation
    this.sheetOperations.updateWordNavigation();
    
    console.log("Custom words merged successfully");
  }
}
