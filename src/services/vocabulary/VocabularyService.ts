
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
    this.sheetOptions = [
      "phrasal verbs",
      "idioms",
      "topic vocab",
      "grammar",
      "phrases, collocations",
      "word formation"
    ];
    
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

  // NEW: Method to get all words across every sheet
  getAllWords(): VocabularyWord[] {
    return this.sheetOptions.flatMap(sheet => this.dataManager.getWordList(sheet));
  }
  
  // FIXED: Method to add a vocabulary change listener
  addVocabularyChangeListener(listener: VocabularyChangeListener): void {
    this.dataManager.addVocabularyChangeListener(listener);
  }
  
  // FIXED: Method to remove a vocabulary change listener
  removeVocabularyChangeListener(listener: VocabularyChangeListener): void {
    this.dataManager.removeVocabularyChangeListener(listener);
  }
  
  // NEW: Method to get all available sheet names
  getAllSheetNames(): string[] {
    return this.sheetOptions;
  }
  
  async processExcelFile(file: File): Promise<boolean> {
    return this.vocabularyOperations.processExcelFile(file);
  }
  
  async loadDefaultVocabulary(data?: SheetData): Promise<boolean> {
    const result = await this.dataManager.loadDefaultVocabulary();
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
}
