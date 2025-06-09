
import { VocabularyServiceCore } from "./VocabularyServiceCore";

/**
 * Handles vocabulary service initialization and setup
 */
export class VocabularyServiceInitialization extends VocabularyServiceCore {
  
  initializeService(): void {
    this.initializeCurrentCategory();
    this.wordNavigation.shuffleCurrentSheet();
    console.log(`VocabularyService initialized with sheet "${this.wordNavigation.getCurrentSheetName()}"`);
  }
  
  private initializeCurrentCategory(): void {
    try {
      const storedStates = localStorage.getItem('buttonStates');
      if (storedStates) {
        const parsedStates = JSON.parse(storedStates);
        
        // Handle migration from "All words" to "phrasal verbs"
        if (parsedStates.currentCategory === "All words") {
          console.log('Migrating from "All words" to "phrasal verbs"');
          parsedStates.currentCategory = "phrasal verbs";
          localStorage.setItem('buttonStates', JSON.stringify(parsedStates));
          this.wordNavigation.setCurrentSheetName("phrasal verbs");
        } else if (parsedStates.currentCategory && this.sheetOptions.includes(parsedStates.currentCategory)) {
          this.wordNavigation.setCurrentSheetName(parsedStates.currentCategory);
          console.log(`Restored sheet name from localStorage: ${this.wordNavigation.getCurrentSheetName()}`);
        } else {
          // Invalid category, default to phrasal verbs
          this.wordNavigation.setCurrentSheetName("phrasal verbs");
          parsedStates.currentCategory = "phrasal verbs";
          localStorage.setItem('buttonStates', JSON.stringify(parsedStates));
        }
      } else {
        // No stored state, default to phrasal verbs
        this.wordNavigation.setCurrentSheetName("phrasal verbs");
        const newStates = { currentCategory: "phrasal verbs" };
        localStorage.setItem('buttonStates', JSON.stringify(newStates));
      }
    } catch (error) {
      console.error("Error handling localStorage migration:", error);
      // Fallback to default
      this.wordNavigation.setCurrentSheetName("phrasal verbs");
    }
  }
}
