
import { VocabularyWord, SheetData } from "@/types/vocabulary";
import { VocabularyStorage } from "./vocabularyStorage";
import { SheetManager } from "./sheetManager";
import { DEFAULT_VOCABULARY_DATA } from "@/data/defaultVocabulary";

class VocabularyService {
  private data: SheetData;
  private currentSheetName: string = "All words";
  private shuffledIndices: number[] = [];
  private currentIndex: number = -1;
  private storage: VocabularyStorage;
  private sheetManager: SheetManager;
  private lastWordChangeTime: number = 0;
  
  readonly sheetOptions: string[];
  
  constructor() {
    this.storage = new VocabularyStorage();
    this.sheetManager = new SheetManager();
    this.data = this.storage.loadData();
    this.sheetOptions = this.sheetManager.sheetOptions;
    
    // Get initial sheet name from localStorage if available
    try {
      const storedStates = localStorage.getItem('buttonStates');
      if (storedStates) {
        const parsedStates = JSON.parse(storedStates);
        if (parsedStates.currentCategory && this.sheetOptions.includes(parsedStates.currentCategory)) {
          this.currentSheetName = parsedStates.currentCategory;
          console.log(`Restored sheet name from localStorage: ${this.currentSheetName}`);
        }
      }
    } catch (error) {
      console.error("Error reading sheet name from localStorage:", error);
    }
    
    this.shuffleCurrentSheet();
    console.log(`VocabularyService initialized with sheet "${this.currentSheetName}"`);
  }
  
  async processExcelFile(file: File): Promise<boolean> {
    console.log("Processing Excel file in VocabularyService");
    try {
      const newData = await this.sheetManager.processExcelFile(file);
      if (newData) {
        // Store original data length for comparison
        const originalWordCount = this.getTotalWordCount();
        
        // Merge the imported data with existing data
        this.mergeImportedData(newData);
        
        // Save the merged data to storage
        const saveSuccess = this.storage.saveData(this.data);
        if (!saveSuccess) {
          console.error("Failed to save merged data to storage");
          return false;
        }
        
        // Refresh the current sheet
        this.shuffleCurrentSheet();
        
        // Log results of the import
        const newWordCount = this.getTotalWordCount();
        console.log(`Excel import complete: ${newWordCount - originalWordCount} new words added, total ${newWordCount} words`);
        console.log(`Current sheet "${this.currentSheetName}" has ${this.data[this.currentSheetName]?.length || 0} words`);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error processing Excel file in VocabularyService:", error);
      return false;
    }
  }
  
  // Calculate total word count across all sheets
  private getTotalWordCount(): number {
    let count = 0;
    for (const sheetName in this.data) {
      // Skip "All words" to avoid double counting
      if (sheetName !== "All words") {
        count += this.data[sheetName]?.length || 0;
      }
    }
    return count;
  }
  
  // Improved method to merge imported data with existing data
  private mergeImportedData(importedData: SheetData): void {
    console.log("Merging imported data with existing data");
    
    // Go through each sheet in the imported data
    for (const sheetName in importedData) {
      if (!this.data[sheetName]) {
        // If sheet doesn't exist yet, create it
        this.data[sheetName] = [];
      }
      
      // Track duplicates for logging
      let updatedWords = 0;
      let newWords = 0;
      
      // For each word in the imported sheet
      for (const importedWord of importedData[sheetName]) {
        // Skip empty words
        if (!importedWord.word || importedWord.word.trim() === "") continue;
        
        // Check if the word already exists (case-insensitive)
        const existingWordIndex = this.data[sheetName].findIndex(
          existingWord => existingWord.word.toLowerCase() === importedWord.word.toLowerCase()
        );
        
        if (existingWordIndex >= 0) {
          // Update existing word
          this.data[sheetName][existingWordIndex] = {
            ...importedWord,
            // Preserve count if it's higher in the existing record
            count: Math.max(
              importedWord.count || 0, 
              this.data[sheetName][existingWordIndex].count || 0
            )
          };
          updatedWords++;
        } else {
          // Add new word
          this.data[sheetName].push(importedWord);
          newWords++;
        }
      }
      
      console.log(`Sheet "${sheetName}": ${newWords} new words, ${updatedWords} updated words`);
    }
    
    // Make sure "All words" contains everything from other sheets
    this.regenerateAllWordsSheet();
    
    console.log("Merged data complete:", 
      Object.keys(this.data).map(key => `${key}: ${this.data[key].length} words`).join(", "));
  }
  
  // Regenerate "All words" sheet from all other sheets
  private regenerateAllWordsSheet(): void {
    // Create a map to track unique words by lowercase word
    const allWordsMap = new Map<string, VocabularyWord>();
    
    // Add existing "All words" first
    if (this.data["All words"]) {
      for (const word of this.data["All words"]) {
        if (word.word && word.word.trim() !== "") {
          allWordsMap.set(word.word.toLowerCase(), {...word});
        }
      }
    }
    
    // Add words from other sheets
    for (const sheetName of this.sheetOptions) {
      if (sheetName === "All words") continue;
      
      for (const word of (this.data[sheetName] || [])) {
        if (!word.word || word.word.trim() === "") continue;
        
        const lowercaseWord = word.word.toLowerCase();
        
        if (allWordsMap.has(lowercaseWord)) {
          // Update count if higher
          const existingWord = allWordsMap.get(lowercaseWord)!;
          if ((word.count || 0) > (existingWord.count || 0)) {
            existingWord.count = word.count;
          }
        } else {
          // Add new word
          allWordsMap.set(lowercaseWord, {...word});
        }
      }
    }
    
    // Convert map back to array
    this.data["All words"] = Array.from(allWordsMap.values());
    console.log(`Regenerated "All words" sheet with ${this.data["All words"].length} total words`);
  }
  
  loadDefaultVocabulary(data?: SheetData): boolean {
    try {
      const vocabularyData = data || DEFAULT_VOCABULARY_DATA;
      
      this.data = JSON.parse(JSON.stringify(vocabularyData));
      this.storage.saveData(this.data);
      
      this.currentSheetName = "All words";
      this.shuffleCurrentSheet();
      
      return true;
    } catch (error) {
      console.error("Failed to load default vocabulary:", error);
      return false;
    }
  }
  
  private shuffleCurrentSheet() {
    console.log(`Shuffling current sheet: ${this.currentSheetName}`);
    const currentData = this.data[this.currentSheetName] || [];
    if (currentData.length === 0) {
      console.log(`No words in sheet "${this.currentSheetName}"`);
      return;
    }
    
    this.shuffledIndices = Array.from({ length: currentData.length }, (_, i) => i);
    
    // Fisher-Yates shuffle
    for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledIndices[i], this.shuffledIndices[j]] = [this.shuffledIndices[j], this.shuffledIndices[i]];
    }
    
    this.currentIndex = -1;
    console.log(`Shuffled ${this.shuffledIndices.length} words in sheet "${this.currentSheetName}"`);
  }
  
  getCurrentSheetName(): string {
    return this.currentSheetName;
  }
  
  switchSheet(sheetName: string): boolean {
    if (this.sheetOptions.includes(sheetName)) {
      console.log(`Switching sheet from "${this.currentSheetName}" to "${sheetName}"`);
      this.currentSheetName = sheetName;
      this.lastWordChangeTime = Date.now();
      this.shuffleCurrentSheet();
      return true;
    }
    console.warn(`Invalid sheet name: ${sheetName}`);
    return false;
  }
  
  nextSheet(): string {
    const currentIndex = this.sheetOptions.indexOf(this.currentSheetName);
    const nextIndex = (currentIndex + 1) % this.sheetOptions.length;
    const nextSheetName = this.sheetOptions[nextIndex];
    
    console.log(`Changing sheet from "${this.currentSheetName}" to "${nextSheetName}"`);
    this.currentSheetName = nextSheetName;
    this.lastWordChangeTime = Date.now();
    this.shuffleCurrentSheet();
    
    return this.currentSheetName;
  }
  
  getCurrentWord(): VocabularyWord | null {
    const currentData = this.data[this.currentSheetName] || [];
    if (currentData.length === 0 || this.shuffledIndices.length === 0) {
      console.log(`No words available in sheet "${this.currentSheetName}"`);
      return null;
    }
    
    if (this.currentIndex >= 0 && this.currentIndex < this.shuffledIndices.length) {
      const wordIndex = this.shuffledIndices[this.currentIndex];
      const word = currentData[wordIndex];
      if (word) {
        return {...word}; // Return a copy to prevent accidental modifications
      }
    }
    
    console.log("No current word set, returning null");
    return null;
  }
  
  getNextWord(): VocabularyWord | null {
    // Record word change time for debounce checking
    this.lastWordChangeTime = Date.now();
    
    const currentData = this.data[this.currentSheetName] || [];
    if (currentData.length === 0 || this.shuffledIndices.length === 0) {
      console.log(`No words available in sheet "${this.currentSheetName}"`);
      return null;
    }
    
    // Move to next word
    this.currentIndex = (this.currentIndex + 1) % this.shuffledIndices.length;
    const wordIndex = this.shuffledIndices[this.currentIndex];
    
    if (wordIndex !== undefined && currentData[wordIndex]) {
      // Increment count and save
      currentData[wordIndex].count = (currentData[wordIndex].count || 0) + 1;
      this.storage.saveData(this.data);
      
      console.log(`Moving to next word: "${currentData[wordIndex].word}" (index ${this.currentIndex}/${this.shuffledIndices.length-1})`);
      return {...currentData[wordIndex]}; // Return a copy to prevent accidental modifications
    }
    
    console.error("Failed to get next word - invalid index");
    return null;
  }
  
  hasData(): boolean {
    return Object.values(this.data).some(sheet => sheet && sheet.length > 0);
  }
  
  // Get the time of the last word change - useful for debouncing
  getLastWordChangeTime(): number {
    return this.lastWordChangeTime;
  }
}

export const vocabularyService = new VocabularyService();
