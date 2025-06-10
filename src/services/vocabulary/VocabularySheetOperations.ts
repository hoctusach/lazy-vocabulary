
import { WordNavigation } from "./WordNavigation";
import { VocabularyDataManager } from "./VocabularyDataManager";

export class VocabularySheetOperations {
  private wordNavigation: WordNavigation;
  private dataManager: VocabularyDataManager;
  readonly sheetOptions: string[];
  
  constructor(dataManager: VocabularyDataManager, sheetOptions: string[]) {
    this.dataManager = dataManager;
    this.sheetOptions = sheetOptions;
    this.wordNavigation = new WordNavigation(dataManager.getData(), this.sheetOptions);
    
    // Set default sheet to "phrasal verbs" instead of "All words"
    let initialSheet = "phrasal verbs";
    
    // Get initial sheet name from localStorage if available
    try {
      const storedStates = localStorage.getItem('buttonStates');
      if (storedStates) {
        const parsedStates = JSON.parse(storedStates);
        if (parsedStates.currentCategory && this.sheetOptions.includes(parsedStates.currentCategory)) {
          initialSheet = parsedStates.currentCategory;
          console.log(`Restored sheet name from localStorage: ${initialSheet}`);
        }
      }
    } catch (error) {
      console.error("Error reading sheet name from localStorage:", error);
    }
    
    this.wordNavigation.setCurrentSheetName(initialSheet);
    this.wordNavigation.shuffleCurrentSheet();
    console.log(`VocabularySheetOperations initialized with sheet "${this.wordNavigation.getCurrentSheetName()}"`);
  }
  
  getCurrentSheetName(): string {
    return this.wordNavigation.getCurrentSheetName();
  }
  
  switchSheet(sheetName: string): boolean {
    const result = this.wordNavigation.switchSheet(sheetName);
    if (result) {
      // Notify listeners about vocabulary change when sheet is switched
      this.dataManager.notifyVocabularyChange();
    }
    return result;
  }
  
  nextSheet(): string {
    const result = this.wordNavigation.nextSheet();
    // Notify listeners about vocabulary change when sheet is changed
    this.dataManager.notifyVocabularyChange();
    return result;
  }
  
  updateWordNavigation(): void {
    this.wordNavigation.updateData(this.dataManager.getData());
    this.wordNavigation.shuffleCurrentSheet();
  }
  
  getWordNavigation(): WordNavigation {
    return this.wordNavigation;
  }
}
