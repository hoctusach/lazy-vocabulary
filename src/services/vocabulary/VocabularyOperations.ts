
import { VocabularyWord, SheetData } from "@/types/vocabulary";
import { VocabularyDataManager } from "./VocabularyDataManager";
import { VocabularySheetOperations } from "./VocabularySheetOperations";
import { SheetManager } from "../sheet";

export class VocabularyOperations {
  private dataManager: VocabularyDataManager;
  private sheetOperations: VocabularySheetOperations;
  private sheetManager: SheetManager;
  
  constructor(dataManager: VocabularyDataManager, sheetOperations: VocabularySheetOperations) {
    this.dataManager = dataManager;
    this.sheetOperations = sheetOperations;
    this.sheetManager = new SheetManager();
  }
  
  async processExcelFile(file: File): Promise<boolean> {
    console.log("Processing Excel file in VocabularyOperations");
    try {
      const newData = await this.sheetManager.processExcelFile(file);
      if (newData) {
        // Store original data length for comparison
        const originalWordCount = this.dataManager.getTotalWordCount();
        
        // Merge the imported data with existing data
        this.dataManager.mergeImportedData(newData);
        
        // Save the merged data to storage
        const saveSuccess = this.dataManager.saveData();
        if (!saveSuccess) {
          console.error("Failed to save merged data to storage");
          return false;
        }
        
        // Update the word navigation with the new data
        this.sheetOperations.updateWordNavigation();
        
        // Log results of the import
        const newWordCount = this.dataManager.getTotalWordCount();
        console.log(`Excel import complete: ${newWordCount - originalWordCount} new words added, total ${newWordCount} words`);
        console.log(`Current sheet "${this.sheetOperations.getCurrentSheetName()}" has ${this.dataManager.getWordList(this.sheetOperations.getCurrentSheetName()).length} words`);
        
        // Notify listeners about vocabulary change
        this.dataManager.notifyVocabularyChange();
        
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error processing Excel file in VocabularyOperations:", error);
      return false;
    }
  }
  
  getCurrentWord(): VocabularyWord | null {
    return this.sheetOperations.getWordNavigation().getCurrentWord();
  }
  
  getNextWord(): VocabularyWord | null {
    const word = this.sheetOperations.getWordNavigation().getNextWord();
    
    if (word) {
      // Save updated data to storage after count increment
      this.dataManager.saveData();
    }
    
    return word;
  }
  
  getLastWordChangeTime(): number {
    return this.sheetOperations.getWordNavigation().getLastWordChangeTime();
  }
  
  mergeCustomWords(customData: SheetData): void {
    this.dataManager.mergeCustomWords(customData, this.sheetOperations.sheetOptions);
    
    // Update the word navigation with the new data
    this.sheetOperations.updateWordNavigation();
  }
}
