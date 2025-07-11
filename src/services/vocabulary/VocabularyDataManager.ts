
import { VocabularyWord, SheetData } from "@/types/vocabulary";
import { VocabularyStorage } from "../vocabularyStorage";
import { VocabularyDataProcessor } from "./VocabularyDataProcessor";
import { VocabularyImporter } from "./VocabularyImporter";
import { DEFAULT_VOCABULARY_DATA } from "@/data/defaultVocabulary";

// Type for vocabulary change listeners
type VocabularyChangeListener = () => void;

export class VocabularyDataManager {
  private data: SheetData;
  private storage: VocabularyStorage;
  private dataProcessor: VocabularyDataProcessor;
  private importer: VocabularyImporter;
  private vocabularyChangeListeners: VocabularyChangeListener[] = [];
  
  constructor() {
    this.storage = new VocabularyStorage();
    this.data = this.storage.loadData();
    this.dataProcessor = new VocabularyDataProcessor();
    this.importer = new VocabularyImporter(this.storage);
  }
  
  getData(): SheetData {
    return this.data;
  }
  
  setData(data: SheetData): void {
    this.data = data;
  }
  
  // Method to get complete word list for useVocabularyContainerState
  getWordList(sheetName: string): VocabularyWord[] {
    if (this.data[sheetName]) {
      return [...this.data[sheetName]];
    }
    return [];
  }
  
  // Method to add a vocabulary change listener
  addVocabularyChangeListener(listener: VocabularyChangeListener): void {
    this.vocabularyChangeListeners.push(listener);
  }
  
  // Method to remove a vocabulary change listener
  removeVocabularyChangeListener(listener: VocabularyChangeListener): void {
    this.vocabularyChangeListeners = this.vocabularyChangeListeners.filter(l => l !== listener);
  }
  
  // Method to notify all listeners about vocabulary change
  notifyVocabularyChange(): void {
    this.vocabularyChangeListeners.forEach(listener => listener());
  }
  
  getTotalWordCount(): number {
    let count = 0;
    for (const sheetName in this.data) {
      count += this.data[sheetName]?.length || 0;
    }
    return count;
  }
  
  saveData(): boolean {
    return this.storage.saveData(this.data);
  }
  
  hasData(): boolean {
    return Object.values(this.data).some(sheet => sheet && sheet.length > 0);
  }
  
  mergeImportedData(importedData: SheetData): void {
    this.importer.mergeImportedData(importedData, this.data);
  }
  
  loadDefaultVocabulary(): boolean {
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
          console.log("Successfully loaded default vocabulary from JSON file");
          console.log("Fetched data preview:", Object.keys(fetchedData).map(key => 
            `${key}: ${fetchedData[key]?.length || 0} words`
          ));
          
          // Process data to ensure all fields have proper types
          this.data = this.dataProcessor.processDataTypes(fetchedData);
          this.storage.saveData(this.data);
          
          // Notify listeners about vocabulary change
          this.notifyVocabularyChange();
        })
        .catch(error => {
          console.warn("Failed to load from JSON file, using embedded default data:", error);
          
          // Use the embedded default data as fallback
          console.log("Using embedded default vocabulary data");
          this.data = this.dataProcessor.processDataTypes(DEFAULT_VOCABULARY_DATA);
          this.storage.saveData(this.data);
          
          console.log("Embedded data loaded:", Object.keys(this.data).map(key => 
            `${key}: ${this.data[key]?.length || 0} words`
          ));
          
          // Notify listeners about vocabulary change
          this.notifyVocabularyChange();
        });
      
      return true;
    } catch (error) {
      console.error("Failed to load default vocabulary:", error);
      
      // Last resort fallback - use embedded data synchronously
      try {
        this.data = this.dataProcessor.processDataTypes(DEFAULT_VOCABULARY_DATA);
        this.storage.saveData(this.data);
        this.notifyVocabularyChange();
        return true;
      } catch (fallbackError) {
        console.error("Critical error: Failed to load any vocabulary data:", fallbackError);
        return false;
      }
    }
  }
  
  mergeCustomWords(customData: SheetData, sheetOptions: string[]): void {
    console.log("Merging custom words with existing data");
    
    // Add each custom category to sheetOptions if it doesn't exist already
    for (const category in customData) {
      if (!sheetOptions.includes(category)) {
        (sheetOptions as string[]).push(category);
        console.log(`Added new category: ${category}`);
      }
    }
    
    // Use the importer to merge words
    this.importer.mergeImportedData(customData, this.data);
    
    // Save the updated data to storage
    this.storage.saveData(this.data);
    
    // Notify listeners about vocabulary change
    this.notifyVocabularyChange();
  }
}
