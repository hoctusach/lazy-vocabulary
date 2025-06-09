
import { VocabularyWord } from "@/types/vocabulary";
import { VocabularyServiceFileOperations } from "./VocabularyServiceFileOperations";

/**
 * Handles navigation operations for vocabulary service
 */
export class VocabularyServiceNavigation extends VocabularyServiceFileOperations {
  
  getCurrentSheetName(): string {
    return this.wordNavigation.getCurrentSheetName();
  }
  
  switchSheet(sheetName: string): boolean {
    const result = this.wordNavigation.switchSheet(sheetName);
    if (result) {
      // Notify listeners about vocabulary change when sheet is switched
      this.notifyVocabularyChange();
    }
    return result;
  }
  
  nextSheet(): string {
    const result = this.wordNavigation.nextSheet();
    // Notify listeners about vocabulary change when sheet is changed
    this.notifyVocabularyChange();
    return result;
  }
  
  getCurrentWord(): VocabularyWord | null {
    return this.wordNavigation.getCurrentWord();
  }
  
  getNextWord(): VocabularyWord | null {
    const word = this.wordNavigation.getNextWord();
    
    if (word) {
      // Save updated data to storage after count increment
      this.storage.saveData(this.data);
    }
    
    return word;
  }
  
  getLastWordChangeTime(): number {
    return this.wordNavigation.getLastWordChangeTime();
  }
}
