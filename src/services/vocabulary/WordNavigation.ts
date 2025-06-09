
import { VocabularyWord, SheetData } from "@/types/vocabulary";

export class WordNavigation {
  private data: SheetData;
  private currentSheetName: string = "All words";
  private shuffledIndices: number[] = [];
  private currentIndex: number = -1;
  private lastWordChangeTime: number = 0;
  private sheetOptions: string[];
  
  constructor(data: SheetData, sheetOptions: string[]) {
    this.data = data;
    this.sheetOptions = sheetOptions;
  }
  
  updateData(newData: SheetData): void {
    this.data = newData;
  }
  
  getCurrentSheetName(): string {
    return this.currentSheetName;
  }
  
  setCurrentSheetName(sheetName: string): void {
    this.currentSheetName = sheetName;
  }
  
  shuffleCurrentSheet(): void {
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
    
    // Reset to start with the first word
    this.currentIndex = -1;
    console.log(`Shuffled ${this.shuffledIndices.length} words in sheet "${this.currentSheetName}"`);
  }
  
  switchSheet(sheetName: string): boolean {
    // Ensure we never switch to an invalid category
    if (!sheetName || !this.sheetOptions.includes(sheetName)) {
      console.warn(`Invalid sheet name: ${sheetName}`);
      return false;
    }
    
    // Don't do anything if we're already on this sheet
    if (this.currentSheetName === sheetName) {
      console.log(`Already on sheet: ${sheetName}`);
      return true;
    }
    
    console.log(`Switching sheet from "${this.currentSheetName}" to "${sheetName}"`);
    this.currentSheetName = sheetName;
    this.lastWordChangeTime = Date.now();
    
    // Reset index and re-shuffle the sheet
    this.currentIndex = -1;
    this.shuffleCurrentSheet();
    
    // Store current category in localStorage for persistence
    try {
      const storedStates = localStorage.getItem('buttonStates');
      const states = storedStates ? JSON.parse(storedStates) : {};
      states.currentCategory = sheetName;
      localStorage.setItem('buttonStates', JSON.stringify(states));
    } catch (error) {
      console.error("Error saving current category to localStorage:", error);
    }
    
    return true;
  }
  
  nextSheet(): string {
    const currentIndex = this.sheetOptions.indexOf(this.currentSheetName);
    const nextIndex = (currentIndex + 1) % this.sheetOptions.length;
    const nextSheetName = this.sheetOptions[nextIndex];
    
    console.log(`Changing sheet from "${this.currentSheetName}" to "${nextSheetName}"`);
    this.currentSheetName = nextSheetName;
    this.lastWordChangeTime = Date.now();
    
    // Reset index and re-shuffle
    this.currentIndex = -1;
    this.shuffleCurrentSheet();
    
    // Store current category
    try {
      const storedStates = localStorage.getItem('buttonStates');
      const states = storedStates ? JSON.parse(storedStates) : {};
      states.currentCategory = nextSheetName;
      localStorage.setItem('buttonStates', JSON.stringify(states));
    } catch (error) {
      console.error("Error saving current category to localStorage:", error);
    }
    
    return this.currentSheetName;
  }
  
  getCurrentWord(): VocabularyWord | null {
    const currentData = this.data[this.currentSheetName] || [];
    if (currentData.length === 0 || this.shuffledIndices.length === 0) {
      console.log(`No words available in sheet "${this.currentSheetName}"`);
      return null;
    }
    
    // If we haven't started yet, get the first word
    if (this.currentIndex === -1) {
      this.currentIndex = 0;
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
      const currentValue = currentData[wordIndex].count;
      // Convert to number, add 1, then store in the same format (string or number)
      let newValue: string | number;
      
      if (typeof currentValue === 'string') {
        newValue = String(parseInt(currentValue || '0', 10) + 1);
      } else {
        newValue = (currentValue || 0) + 1;
      }
      
      currentData[wordIndex].count = newValue;
      
      console.log(`Moving to next word: "${currentData[wordIndex].word}" (index ${this.currentIndex}/${this.shuffledIndices.length-1})`);
      return {...currentData[wordIndex]}; // Return a copy to prevent accidental modifications
    }
    
    console.error("Failed to get next word - invalid index");
    return null;
  }
  
  getLastWordChangeTime(): number {
    return this.lastWordChangeTime;
  }
}
