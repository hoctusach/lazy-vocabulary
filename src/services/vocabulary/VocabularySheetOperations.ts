
import { WordNavigation } from "./WordNavigation";
import { VocabularyDataManager } from "./VocabularyDataManager";
import { BUTTON_STATES_KEY } from '@/utils/storageKeys';

export class VocabularySheetOperations {
  private wordNavigation: WordNavigation;
  private dataManager: VocabularyDataManager;
  readonly sheetOptions: string[];
  
  constructor(dataManager: VocabularyDataManager, sheetOptions: string[]) {
    this.dataManager = dataManager;
    this.sheetOptions = sheetOptions;
    this.wordNavigation = new WordNavigation(dataManager.getData(), this.sheetOptions);
    
    // Try to restore last used sheet from localStorage
    let restoredSheet: string | null = null;
    try {
      const storedStates = localStorage.getItem(BUTTON_STATES_KEY);
      if (storedStates) {
        const parsedStates = JSON.parse(storedStates);
        if (parsedStates.currentCategory && this.sheetOptions.includes(parsedStates.currentCategory)) {
          restoredSheet = parsedStates.currentCategory;
          console.log(`Restored sheet name from localStorage: ${restoredSheet}`);
        }
      }
    } catch (error) {
      console.error("Error reading sheet name from localStorage:", error);
    }

    // Use restored sheet if available, otherwise fall back to first sheet option
    const initialSheet = restoredSheet ?? this.sheetOptions[0];
    
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
