
import { VocabularyWord, SheetData } from "@/types/vocabulary";
import { VocabularyStorage } from "../vocabularyStorage";
import { WordNavigation } from "./WordNavigation";

export class VocabularyServiceCore {
  constructor(
    private storage: VocabularyStorage,
    private wordNavigation: WordNavigation,
    private data: SheetData
  ) {}

  // Method to get complete word list for useVocabularyContainerState
  getWordList(): VocabularyWord[] {
    const currentSheet = this.wordNavigation.getCurrentSheetName();
    if (this.data[currentSheet]) {
      return [...this.data[currentSheet]];
    }
    return [];
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
