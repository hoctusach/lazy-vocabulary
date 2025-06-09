
import { VocabularyWord, SheetData } from "@/types/vocabulary";
import { RandomWordSelector } from "./RandomWordSelector";

export class WordNavigation {
  private data: SheetData;
  private currentSheetName: string = "All words";
  private lastWordChangeTime: number = 0;
  private sheetOptions: string[];
  private randomSelector: RandomWordSelector;
  
  constructor(data: SheetData, sheetOptions: string[]) {
    this.data = data;
    this.sheetOptions = sheetOptions;
    this.randomSelector = new RandomWordSelector();
    
    // Initialize the random selector for the current sheet
    this.initializeCurrentSheet();
  }
  
  private initializeCurrentSheet(): void {
    const currentData = this.data[this.currentSheetName] || [];
    this.randomSelector.initializeCategory(this.currentSheetName, currentData);
  }
  
  updateData(newData: SheetData): void {
    this.data = newData;
    // Reinitialize current sheet with new data
    this.initializeCurrentSheet();
  }
  
  getCurrentSheetName(): string {
    return this.currentSheetName;
  }
  
  setCurrentSheetName(sheetName: string): void {
    this.currentSheetName = sheetName;
    this.initializeCurrentSheet();
  }
  
  shuffleCurrentSheet(): void {
    console.log(`[WORD-NAVIGATION] Shuffling current sheet: ${this.currentSheetName}`);
    const currentData = this.data[this.currentSheetName] || [];
    if (currentData.length === 0) {
      console.log(`[WORD-NAVIGATION] No words in sheet "${this.currentSheetName}"`);
      return;
    }
    
    // Initialize the random selector for this category
    this.randomSelector.initializeCategory(this.currentSheetName, currentData);
    console.log(`[WORD-NAVIGATION] Initialized random selection for "${this.currentSheetName}" with ${currentData.length} words`);
  }
  
  switchSheet(sheetName: string): boolean {
    // Ensure we never switch to an invalid category
    if (!sheetName || !this.sheetOptions.includes(sheetName)) {
      console.warn(`[WORD-NAVIGATION] Invalid sheet name: ${sheetName}`);
      return false;
    }
    
    // Don't do anything if we're already on this sheet
    if (this.currentSheetName === sheetName) {
      console.log(`[WORD-NAVIGATION] Already on sheet: ${sheetName}`);
      return true;
    }
    
    console.log(`[WORD-NAVIGATION] Switching sheet from "${this.currentSheetName}" to "${sheetName}"`);
    this.currentSheetName = sheetName;
    this.lastWordChangeTime = Date.now();
    
    // Initialize the new sheet
    this.initializeCurrentSheet();
    
    // Store current category in localStorage for persistence
    try {
      const storedStates = localStorage.getItem('buttonStates');
      const states = storedStates ? JSON.parse(storedStates) : {};
      states.currentCategory = sheetName;
      localStorage.setItem('buttonStates', JSON.stringify(states));
    } catch (error) {
      console.error("[WORD-NAVIGATION] Error saving current category to localStorage:", error);
    }
    
    return true;
  }
  
  nextSheet(): string {
    const currentIndex = this.sheetOptions.indexOf(this.currentSheetName);
    const nextIndex = (currentIndex + 1) % this.sheetOptions.length;
    const nextSheetName = this.sheetOptions[nextIndex];
    
    console.log(`[WORD-NAVIGATION] Changing sheet from "${this.currentSheetName}" to "${nextSheetName}"`);
    this.currentSheetName = nextSheetName;
    this.lastWordChangeTime = Date.now();
    
    // Initialize the new sheet
    this.initializeCurrentSheet();
    
    // Store current category
    try {
      const storedStates = localStorage.getItem('buttonStates');
      const states = storedStates ? JSON.parse(storedStates) : {};
      states.currentCategory = nextSheetName;
      localStorage.setItem('buttonStates', JSON.stringify(states));
    } catch (error) {
      console.error("[WORD-NAVIGATION] Error saving current category to localStorage:", error);
    }
    
    return this.currentSheetName;
  }
  
  getCurrentWord(): VocabularyWord | null {
    const currentData = this.data[this.currentSheetName] || [];
    return this.randomSelector.getCurrentWord(this.currentSheetName, currentData);
  }
  
  getNextWord(): VocabularyWord | null {
    // Record word change time for debounce checking
    this.lastWordChangeTime = Date.now();
    
    const currentData = this.data[this.currentSheetName] || [];
    const word = this.randomSelector.getNextWord(this.currentSheetName, currentData);
    
    if (word) {
      console.log(`[WORD-NAVIGATION] Advanced to next random word: "${word.word}" in category "${this.currentSheetName}"`);
    }
    
    return word;
  }
  
  getLastWordChangeTime(): number {
    return this.lastWordChangeTime;
  }
  
  /**
   * Get statistics for the current category
   */
  getCurrentCategoryStats(): {
    totalWords: number;
    viewedWords: number;
    currentPosition: number;
    totalPositions: number;
  } {
    const currentData = this.data[this.currentSheetName] || [];
    return this.randomSelector.getCategoryStats(this.currentSheetName, currentData);
  }
  
  /**
   * Reset viewed words for current category
   */
  resetCurrentCategoryProgress(): void {
    this.randomSelector.resetViewedWords(this.currentSheetName);
    this.initializeCurrentSheet();
  }
}
