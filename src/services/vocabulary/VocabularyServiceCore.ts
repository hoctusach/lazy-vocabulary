
import { VocabularyWord, SheetData } from "@/types/vocabulary";
import { VocabularyStorage } from "../vocabularyStorage";
import { SheetManager } from "../sheet";
import { VocabularyDataProcessor } from "./VocabularyDataProcessor";
import { VocabularyImporter } from "./VocabularyImporter";
import { WordNavigation } from "./WordNavigation";

/**
 * Core vocabulary service functionality
 */
export class VocabularyServiceCore {
  protected data: SheetData;
  protected storage: VocabularyStorage;
  protected sheetManager: SheetManager;
  protected dataProcessor: VocabularyDataProcessor;
  protected importer: VocabularyImporter;
  protected wordNavigation: WordNavigation;
  
  readonly sheetOptions: string[];
  
  constructor() {
    this.storage = new VocabularyStorage();
    this.sheetManager = new SheetManager();
    this.data = this.storage.loadData();
    this.sheetOptions = this.sheetManager.sheetOptions;
    
    this.dataProcessor = new VocabularyDataProcessor();
    this.importer = new VocabularyImporter(this.storage);
    this.wordNavigation = new WordNavigation(this.data, this.sheetOptions);
  }
  
  protected getTotalWordCount(): number {
    let count = 0;
    for (const sheetName in this.data) {
      count += this.data[sheetName]?.length || 0;
    }
    return count;
  }
  
  hasData(): boolean {
    return Object.values(this.data).some(sheet => sheet && sheet.length > 0);
  }
  
  getWordList(): VocabularyWord[] {
    const currentSheet = this.wordNavigation.getCurrentSheetName();
    if (this.data[currentSheet]) {
      return [...this.data[currentSheet]];
    }
    return [];
  }
}
