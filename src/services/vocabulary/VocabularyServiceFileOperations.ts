
import { SheetData } from "@/types/vocabulary";
import { DEFAULT_VOCABULARY_DATA } from "@/data/defaultVocabulary";
import { VocabularyServiceListeners } from "./VocabularyServiceListeners";

/**
 * Handles file operations for vocabulary service
 */
export class VocabularyServiceFileOperations extends VocabularyServiceListeners {
  
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
        this.notifyVocabularyChange();
        
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error processing Excel file in VocabularyService:", error);
      return false;
    }
  }
  
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
          this.data = this.dataProcessor.processDataTypes(fetchedData);
          this.storage.saveData(this.data);
          this.wordNavigation.setCurrentSheetName("phrasal verbs");
          this.wordNavigation.updateData(this.data);
          this.wordNavigation.shuffleCurrentSheet();
          
          // Notify listeners about vocabulary change
          this.notifyVocabularyChange();
        })
        .catch(error => {
          console.warn("Failed to load from JSON file, using built-in default vocabulary:", error);
          // Fallback to built-in default vocabulary if fetch fails
          const vocabularyData = data || DEFAULT_VOCABULARY_DATA;
          this.data = this.dataProcessor.processDataTypes(JSON.parse(JSON.stringify(vocabularyData)));
          this.storage.saveData(this.data);
          this.wordNavigation.setCurrentSheetName("phrasal verbs");
          this.wordNavigation.updateData(this.data);
          this.wordNavigation.shuffleCurrentSheet();
          
          // Notify listeners about vocabulary change
          this.notifyVocabularyChange();
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
      if (!this.sheetOptions.includes(category)) {
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
    this.notifyVocabularyChange();
  }
}
