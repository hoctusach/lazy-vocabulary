
import { VocabularyWord, SheetData } from "@/types/vocabulary";
import { VocabularyStorage } from "../vocabularyStorage";
import { SheetManager } from "../sheet";
import { VocabularyDataProcessor } from "./VocabularyDataProcessor";
import { VocabularyImporter } from "./VocabularyImporter";
import { WordNavigation } from "./WordNavigation";
import { VocabularyEventManager } from "./VocabularyEventManager";
import { VocabularyFileProcessor } from "./VocabularyFileProcessor";
import { VocabularyDataManager } from "./VocabularyDataManager";
import { VocabularySheetManager } from "./VocabularySheetManager";
import { VocabularyServiceCore } from "./VocabularyServiceCore";

export class VocabularyService {
  private data: SheetData;
  private storage: VocabularyStorage;
  private sheetManager: SheetManager;
  private dataProcessor: VocabularyDataProcessor;
  private importer: VocabularyImporter;
  private wordNavigation: WordNavigation;
  private eventManager: VocabularyEventManager;
  private fileProcessor: VocabularyFileProcessor;
  private dataManager: VocabularyDataManager;
  private sheetManagerService: VocabularySheetManager;
  private core: VocabularyServiceCore;
  
  readonly sheetOptions: string[];
  
  constructor() {
    this.storage = new VocabularyStorage();
    this.sheetManager = new SheetManager();
    this.data = this.storage.loadData();
    this.sheetOptions = this.sheetManager.sheetOptions;
    
    this.dataProcessor = new VocabularyDataProcessor();
    this.importer = new VocabularyImporter(this.storage);
    this.wordNavigation = new WordNavigation(this.data, this.sheetOptions);
    this.eventManager = new VocabularyEventManager();
    
    // Initialize composed services
    this.fileProcessor = new VocabularyFileProcessor(
      this.storage,
      this.sheetManager,
      this.importer,
      this.wordNavigation,
      this.eventManager,
      this.data
    );
    
    this.dataManager = new VocabularyDataManager(
      this.storage,
      this.dataProcessor,
      this.importer,
      this.wordNavigation,
      this.eventManager,
      this.data,
      this.sheetOptions
    );
    
    this.sheetManagerService = new VocabularySheetManager(
      this.wordNavigation,
      this.eventManager
    );
    
    this.core = new VocabularyServiceCore(
      this.storage,
      this.wordNavigation,
      this.data
    );
    
    // Get initial sheet name from localStorage if available
    try {
      const storedStates = localStorage.getItem('buttonStates');
      if (storedStates) {
        const parsedStates = JSON.parse(storedStates);
        if (parsedStates.currentCategory && this.sheetOptions.includes(parsedStates.currentCategory)) {
          this.wordNavigation.setCurrentSheetName(parsedStates.currentCategory);
          console.log(`Restored sheet name from localStorage: ${this.wordNavigation.getCurrentSheetName()}`);
        }
      }
    } catch (error) {
      console.error("Error reading sheet name from localStorage:", error);
    }
    
    this.wordNavigation.shuffleCurrentSheet();
    console.log(`VocabularyService initialized with sheet "${this.wordNavigation.getCurrentSheetName()}"`);
  }
  
  // Event management methods
  addVocabularyChangeListener(listener: () => void): void {
    this.eventManager.addVocabularyChangeListener(listener);
  }
  
  removeVocabularyChangeListener(listener: () => void): void {
    this.eventManager.removeVocabularyChangeListener(listener);
  }
  
  // Core methods
  getWordList(): VocabularyWord[] {
    return this.core.getWordList();
  }
  
  getCurrentWord(): VocabularyWord | null {
    return this.core.getCurrentWord();
  }
  
  getNextWord(): VocabularyWord | null {
    return this.core.getNextWord();
  }
  
  getLastWordChangeTime(): number {
    return this.core.getLastWordChangeTime();
  }
  
  hasData(): boolean {
    return this.dataManager.hasData();
  }
  
  // File processing methods
  async processExcelFile(file: File): Promise<boolean> {
    return this.fileProcessor.processExcelFile(file);
  }
  
  // Data management methods
  loadDefaultVocabulary(data?: SheetData): boolean {
    return this.dataManager.loadDefaultVocabulary(data);
  }
  
  mergeCustomWords(customData: SheetData): void {
    this.dataManager.mergeCustomWords(customData);
  }
  
  // Sheet management methods
  getCurrentSheetName(): string {
    return this.sheetManagerService.getCurrentSheetName();
  }
  
  switchSheet(sheetName: string): boolean {
    return this.sheetManagerService.switchSheet(sheetName);
  }
  
  nextSheet(): string {
    return this.sheetManagerService.nextSheet();
  }
}
