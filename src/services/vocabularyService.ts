
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
  
  readonly sheetOptions: string[];
  
  constructor() {
    this.storage = new VocabularyStorage();
    this.sheetManager = new SheetManager();
    this.data = this.storage.loadData();
    this.sheetOptions = this.sheetManager.sheetOptions;
    this.shuffleCurrentSheet();
  }
  
  async processExcelFile(file: File): Promise<boolean> {
    const newData = await this.sheetManager.processExcelFile(file);
    if (newData) {
      this.data = newData;
      this.storage.saveData(this.data);
      this.shuffleCurrentSheet();
      return true;
    }
    return false;
  }
  
  loadDefaultVocabulary(): boolean {
    try {
      // Load the default vocabulary data
      this.data = JSON.parse(JSON.stringify(DEFAULT_VOCABULARY_DATA));
      
      // Save to storage
      this.storage.saveData(this.data);
      
      // Reset the current sheet and shuffle
      this.currentSheetName = "All words";
      this.shuffleCurrentSheet();
      
      return true;
    } catch (error) {
      console.error("Failed to load default vocabulary:", error);
      return false;
    }
  }
  
  private shuffleCurrentSheet() {
    const currentData = this.data[this.currentSheetName] || [];
    if (currentData.length === 0) return;
    
    this.shuffledIndices = Array.from({ length: currentData.length }, (_, i) => i);
    
    // Fisher-Yates shuffle
    for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledIndices[i], this.shuffledIndices[j]] = [this.shuffledIndices[j], this.shuffledIndices[i]];
    }
    
    this.currentIndex = -1;
  }
  
  getCurrentSheetName(): string {
    return this.currentSheetName;
  }
  
  switchSheet(sheetName: string): boolean {
    if (this.sheetOptions.includes(sheetName)) {
      this.currentSheetName = sheetName;
      this.shuffleCurrentSheet();
      return true;
    }
    return false;
  }
  
  nextSheet(): string {
    const currentIndex = this.sheetOptions.indexOf(this.currentSheetName);
    const nextIndex = (currentIndex + 1) % this.sheetOptions.length;
    this.currentSheetName = this.sheetOptions[nextIndex];
    this.shuffleCurrentSheet();
    return this.currentSheetName;
  }
  
  getCurrentWord(): VocabularyWord | null {
    const currentData = this.data[this.currentSheetName] || [];
    if (currentData.length === 0 || this.shuffledIndices.length === 0) return null;
    
    if (this.currentIndex >= 0 && this.currentIndex < this.shuffledIndices.length) {
      const wordIndex = this.shuffledIndices[this.currentIndex];
      return currentData[wordIndex];
    }
    
    return null;
  }
  
  getNextWord(): VocabularyWord | null {
    const currentData = this.data[this.currentSheetName] || [];
    if (currentData.length === 0 || this.shuffledIndices.length === 0) return null;
    
    this.currentIndex = (this.currentIndex + 1) % this.shuffledIndices.length;
    const wordIndex = this.shuffledIndices[this.currentIndex];
    
    if (wordIndex !== undefined && currentData[wordIndex]) {
      currentData[wordIndex].count = (currentData[wordIndex].count || 0) + 1;
      this.storage.saveData(this.data);
      return currentData[wordIndex];
    }
    
    return null;
  }
  
  hasData(): boolean {
    return Object.values(this.data).some(sheet => sheet.length > 0);
  }
}

export const vocabularyService = new VocabularyService();
