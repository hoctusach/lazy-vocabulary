
import { VocabularyWord, SheetData } from "@/types/vocabulary";
import { VocabularyDataManager } from "./VocabularyDataManager";
import { VocabularyDataProcessor } from "./VocabularyDataProcessor";
import { VocabularySheetOperations } from "./VocabularySheetOperations";
import { VocabularyOperations } from "./VocabularyOperations";

// Type for vocabulary change listeners
type VocabularyChangeListener = () => void;

export class VocabularyService {
  private dataManager: VocabularyDataManager;
  private sheetOperations: VocabularySheetOperations;
  private vocabularyOperations: VocabularyOperations;
  
  readonly sheetOptions: string[];
  private readonly builtinSheetOptions: string[];
  
  constructor() {
    // Updated sheet options without "All words"
    this.builtinSheetOptions = [
      "phrasal verbs",
      "idioms",
      "topic vocab",
      "grammar",
      "phrases, collocations",
      "word formation"
    ];
    this.sheetOptions = [...this.builtinSheetOptions];
    
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
      this.restoreBuiltinSheets();
      this.sheetOperations.updateWordNavigation();
    }
    return result;
  }

  /** Replace the in-memory deck with an imported set. Categories come from the file. */
  loadSheetData(data: SheetData): boolean {
    const processed = new VocabularyDataProcessor().processDataTypes(data);
    const names = Object.keys(processed).filter((name) => (processed[name]?.length ?? 0) > 0);
    if (names.length === 0) return false;
    this.dataManager.setData(processed);
    this.sheetOptions.splice(0, this.sheetOptions.length, ...names);
    const navigation = this.sheetOperations.getWordNavigation();
    if (!names.includes(navigation.getCurrentSheetName())) {
      navigation.setCurrentSheetName(names[0]);
    }
    this.sheetOperations.updateWordNavigation();
    this.dataManager.notifyVocabularyChange();
    return true;
  }

  restoreBuiltinSheets(): void {
    this.sheetOptions.splice(0, this.sheetOptions.length, ...this.builtinSheetOptions);
    const navigation = this.sheetOperations.getWordNavigation();
    if (!this.builtinSheetOptions.includes(navigation.getCurrentSheetName())) {
      navigation.setCurrentSheetName(this.builtinSheetOptions[0]);
    }
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
