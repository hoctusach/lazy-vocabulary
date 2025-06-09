
import { WordNavigation } from "./WordNavigation";
import { VocabularyEventManager } from "./VocabularyEventManager";

export class VocabularySheetManager {
  constructor(
    private wordNavigation: WordNavigation,
    private eventManager: VocabularyEventManager
  ) {}

  getCurrentSheetName(): string {
    return this.wordNavigation.getCurrentSheetName();
  }

  switchSheet(sheetName: string): boolean {
    const result = this.wordNavigation.switchSheet(sheetName);
    if (result) {
      // Notify listeners about vocabulary change when sheet is switched
      this.eventManager.notifyVocabularyChange();
    }
    return result;
  }

  nextSheet(): string {
    const result = this.wordNavigation.nextSheet();
    // Notify listeners about vocabulary change when sheet is changed
    this.eventManager.notifyVocabularyChange();
    return result;
  }
}
