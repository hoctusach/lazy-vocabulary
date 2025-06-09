
import { SheetData } from "@/types/vocabulary";
import { VocabularyStorage } from "../vocabularyStorage";
import { SheetManager } from "../sheet";
import { VocabularyImporter } from "./VocabularyImporter";
import { WordNavigation } from "./WordNavigation";
import { VocabularyEventManager } from "./VocabularyEventManager";

export class VocabularyFileProcessor {
  constructor(
    private storage: VocabularyStorage,
    private sheetManager: SheetManager,
    private importer: VocabularyImporter,
    private wordNavigation: WordNavigation,
    private eventManager: VocabularyEventManager,
    private data: SheetData
  ) {}

  private getTotalWordCount(): number {
    let count = 0;
    for (const sheetName in this.data) {
      // Skip "All words" to avoid double counting
      if (sheetName !== "All words") {
        count += this.data[sheetName]?.length || 0;
      }
    }
    return count;
  }

  async processExcelFile(file: File): Promise<boolean> {
    console.log("Processing Excel file in VocabularyService");
    try {
      const newData = await this.sheetManager.processExcelFile(file);
      if (newData) {
        // Store original data length for comparison
        const originalWordCount = this.getTotalWordCount();
        
        // Merge the imported data with existing data
        this.importer.mergeImportedData(newData, this.data);
        
        // Save the merged data to storage
        const saveSuccess = this.storage.saveData(this.data);
        if (!saveSuccess) {
          console.error("Failed to save merged data to storage");
          return false;
        }
        
        // Update the word navigation with the new data
        this.wordNavigation.updateData(this.data);
        // Refresh the current sheet
        this.wordNavigation.shuffleCurrentSheet();
        
        // Log results of the import
        const newWordCount = this.getTotalWordCount();
        console.log(`Excel import complete: ${newWordCount - originalWordCount} new words added, total ${newWordCount} words`);
        console.log(`Current sheet "${this.wordNavigation.getCurrentSheetName()}" has ${this.data[this.wordNavigation.getCurrentSheetName()]?.length || 0} words`);
        
        // Notify listeners about vocabulary change
        this.eventManager.notifyVocabularyChange();
        
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error processing Excel file in VocabularyService:", error);
      return false;
    }
  }
}
