
import { VocabularyShuffler } from './VocabularyShuffler';
import { VocabularyLoader } from './VocabularyLoader';
import { VocabularyMerger } from './VocabularyMerger';
import { VocabularyStorage } from './vocabularyStorage';
import { SheetManager } from './sheetManager';
import { SheetData, VocabularyWord } from '@/types/vocabulary';

class VocabularyService {
  private data: SheetData = {};
  private currentSheetName: string = "All words";
  private shuffler = new VocabularyShuffler();
  private storage = new VocabularyStorage();
  private sheetManager = new SheetManager();
  readonly sheetOptions = ["All words", "phrasal verbs", "idioms", "advanced words"];

  constructor() {
    // Load data on initialization
    this.data = this.storage.loadData();
    console.log("Vocabulary service initialized with data:", Object.keys(this.data));
  }

  hasData(): boolean {
    return Object.keys(this.data).length > 0 && 
           this.data[this.currentSheetName] &&
           this.data[this.currentSheetName].length > 0;
  }

  getCurrentData(): SheetData {
    return this.data;
  }

  getCurrentSheet(): VocabularyWord[] {
    return this.data[this.currentSheetName] || [];
  }

  getCurrentSheetName(): string {
    return this.currentSheetName;
  }

  nextSheet(): string {
    const currentIndex = this.sheetOptions.indexOf(this.currentSheetName);
    const nextIndex = (currentIndex + 1) % this.sheetOptions.length;
    this.currentSheetName = this.sheetOptions[nextIndex];
    this.shuffleSheet();
    return this.currentSheetName;
  }

  setData(data: SheetData): void {
    this.data = data;
    this.storage.saveData(data);
    this.shuffleSheet();
  }

  setSheetName(name: string): void {
    if (this.data[name]) {
      this.currentSheetName = name;
      this.shuffleSheet();
    }
  }

  shuffleSheet(): void {
    if (this.data[this.currentSheetName]) {
      this.shuffler.shuffle(this.data[this.currentSheetName]);
    }
  }

  getCurrentWord(): VocabularyWord | null {
    return this.shuffler.getCurrentWord(this.data[this.currentSheetName] || []);
  }

  getNextWord(): VocabularyWord | null {
    return this.shuffler.getNextWord(this.data[this.currentSheetName] || []);
  }

  async processExcelFile(file: File): Promise<boolean> {
    const newData = await this.sheetManager.processExcelFile(file);
    if (newData) {
      this.data = newData;
      this.storage.saveData(newData);
      this.shuffleSheet();
      return true;
    }
    return false;
  }

  async loadDefaultVocabulary(): Promise<boolean> {
    return VocabularyLoader.loadDefaultVocabulary(
      (data) => this.setData(data),
      (name) => this.setSheetName(name),
      () => this.shuffleSheet()
    );
  }

  mergeImportedData(importedData: SheetData): SheetData {
    const merged = VocabularyMerger.mergeImportedData(this.data, importedData, this.sheetOptions);
    this.setData(merged);
    return merged;
  }
}

// Export a singleton instance
export const vocabularyService = new VocabularyService();
