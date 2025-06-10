
import { VocabularyWord, SheetData } from "@/types/vocabulary";
import { VocabularyDataManager } from "./VocabularyDataManager";
import { VocabularySheetOperations } from "./VocabularySheetOperations";
import { VocabularyOperations } from "./VocabularyOperations";

// Type for vocabulary change listeners
type VocabularyChangeListener = () => void;

export class VocabularyService {
  private dataManager: VocabularyDataManager;
  private sheetOperations: VocabularySheetOperations;
  private vocabularyOperations: VocabularyOperations;
  
  readonly sheetOptions: string[];
  
  constructor() {
    // Updated sheet options without "All words"
    this.sheetOptions = ["phrasal verbs", "idioms", "advanced words"];
    
    // Initialize the components
    this.dataManager = new VocabularyDataManager();
    this.sheetOperations = new VocabularySheetOperations(this.dataManager, this.sheetOptions);
    this.vocabularyOperations = new VocabularyOperations(this.dataManager, this.sheetOperations);
    
    console.log(`VocabularyService initialized with sheet "${this.sheetOperations.getCurrentSheetName()}"`);
  }
  
  // FIXED: Method to get complete word list for useVocabularyContainerState
  getWordList(): VocabularyWord[] {
    const currentSheet = this.sheetOperations.getCurrentSheetName();
    return this.dataManager.getWordList(currentSheet);
  }
  
  // FIXED: Method to add a vocabulary change listener
  addVocabularyChangeListener(listener: VocabularyChangeListener): void {
    this.dataManager.addVocabularyChangeListener(listener);
  }
  
  // FIXED: Method to remove a vocabulary change listener
  removeVocabularyChangeListener(listener: VocabularyChangeListener): void {
    this.dataManager.removeVocabularyChangeListener(listener);
  }
  
  async processExcelFile(file: File): Promise<boolean> {
    return this.vocabularyOperations.processExcelFile(file);
  }
  
  loadDefaultVocabulary(data?: SheetData): boolean {
    const result = this.dataManager.loadDefaultVocabulary();
    if (result) {
      this.sheetOperations.updateWordNavigation();
    }
    return result;
  }
  
  getCurrentSheetName(): string {
    return this.sheetOperations.getCurrentSheetName();
  }
  
  switchSheet(sheetName: string): boolean {
    return this.sheetOperations.switchSheet(sheetName);
  }
  
  nextSheet(): string {
    return this.sheetOperations.nextSheet();
  }
  
  getCurrentWord(): VocabularyWord | null {
    return this.vocabularyOperations.getCurrentWord();
  }
  
  getNextWord(): VocabularyWord | null {
    return this.vocabularyOperations.getNextWord();
  }
  
  hasData(): boolean {
    return this.dataManager.hasData();
  }
  
  getLastWordChangeTime(): number {
    return this.vocabularyOperations.getLastWordChangeTime();
  }
  
  mergeCustomWords(customData: SheetData): void {
    this.vocabularyOperations.mergeCustomWords(customData);
  }
}
