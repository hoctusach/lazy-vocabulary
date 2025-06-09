
import { SheetData } from "@/types/vocabulary";
import { VocabularyStorage } from "../vocabularyStorage";
import { VocabularyDataProcessor } from "./VocabularyDataProcessor";
import { VocabularyImporter } from "./VocabularyImporter";
import { WordNavigation } from "./WordNavigation";
import { VocabularyEventManager } from "./VocabularyEventManager";
import { DEFAULT_VOCABULARY_DATA } from "@/data/defaultVocabulary";

export class VocabularyDataManager {
  constructor(
    private storage: VocabularyStorage,
    private dataProcessor: VocabularyDataProcessor,
    private importer: VocabularyImporter,
    private wordNavigation: WordNavigation,
    private eventManager: VocabularyEventManager,
    private data: SheetData,
    private sheetOptions: string[]
  ) {}

  loadDefaultVocabulary(data?: SheetData): boolean {
    try {
      console.log("Loading default vocabulary data");
      // Try to fetch the updated default vocabulary from public directory
      fetch('/defaultVocabulary.json')
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch default vocabulary: ${response.status}`);
          }
          return response.json();
        })
        .then(fetchedData => {
          console.log("Successfully loaded updated default vocabulary from JSON file");
          // Process data to ensure all fields have proper types
          Object.assign(this.data, this.dataProcessor.processDataTypes(fetchedData));
          this.storage.saveData(this.data);
          this.wordNavigation.setCurrentSheetName("All words");
          this.wordNavigation.updateData(this.data);
          this.wordNavigation.shuffleCurrentSheet();
          
          // Notify listeners about vocabulary change
          this.eventManager.notifyVocabularyChange();
        })
        .catch(error => {
          console.warn("Failed to load from JSON file, using built-in default vocabulary:", error);
          // Fallback to built-in default vocabulary if fetch fails
          const vocabularyData = data || DEFAULT_VOCABULARY_DATA;
          Object.assign(this.data, this.dataProcessor.processDataTypes(JSON.parse(JSON.stringify(vocabularyData))));
          this.storage.saveData(this.data);
          this.wordNavigation.setCurrentSheetName("All words");
          this.wordNavigation.updateData(this.data);
          this.wordNavigation.shuffleCurrentSheet();
          
          // Notify listeners about vocabulary change
          this.eventManager.notifyVocabularyChange();
        });
      
      return true;
    } catch (error) {
      console.error("Failed to load default vocabulary:", error);
      return false;
    }
  }

  mergeCustomWords(customData: SheetData): void {
    console.log("Merging custom words with existing data");
    
    // Add each custom category to sheetOptions if it doesn't exist already
    for (const category in customData) {
      if (!this.sheetOptions.includes(category) && category !== "All words") {
        (this.sheetOptions as string[]).push(category);
        console.log(`Added new category: ${category}`);
      }
    }
    
    // Use the importer to merge words
    this.importer.mergeImportedData(customData, this.data);
    
    // Update the word navigation with the new data
    this.wordNavigation.updateData(this.data);
    
    // Refresh the current sheet
    this.wordNavigation.shuffleCurrentSheet();
    
    // Save the updated data to storage
    this.storage.saveData(this.data);
    
    // Notify listeners about vocabulary change
    this.eventManager.notifyVocabularyChange();
  }

  hasData(): boolean {
    return Object.values(this.data).some(sheet => sheet && sheet.length > 0);
  }
}
