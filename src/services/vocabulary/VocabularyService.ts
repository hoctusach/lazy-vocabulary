import { VocabularyWord, SheetData } from "@/types/vocabulary";
import { VocabularyStorage } from "../vocabularyStorage";
import { SheetManager } from "../sheet";
import { DEFAULT_VOCABULARY_DATA } from "@/data/defaultVocabulary";
import { VocabularyDataProcessor } from "./VocabularyDataProcessor";
import { VocabularyImporter } from "./VocabularyImporter";
import { WordNavigation } from "./WordNavigation";

// Type for vocabulary change listeners
type VocabularyChangeListener = () => void;

export class VocabularyService {
  private data: SheetData;
  private storage: VocabularyStorage;
  private sheetManager: SheetManager;
  private dataProcessor: VocabularyDataProcessor;
  private importer: VocabularyImporter;
  private wordNavigation: WordNavigation;
  private vocabularyChangeListeners: VocabularyChangeListener[] = [];
  
  readonly sheetOptions: string[];
  
  constructor() {
    this.storage = new VocabularyStorage();
    this.sheetManager = new SheetManager();
    this.data = this.storage.loadData();
    this.sheetOptions = this.sheetManager.sheetOptions;
    
    this.dataProcessor = new VocabularyDataProcessor();
    this.importer = new VocabularyImporter(this.storage);
    this.wordNavigation = new WordNavigation(this.data, this.sheetOptions);
    
    // Get initial sheet name from localStorage if available
    try {
      const storedStates = localStorage.getItem('buttonStates');
      if (storedStates) {
        const parsedStates = JSON.parse(storedStates);
        if (parsedStates.currentCategory && this.sheetOptions.includes(parsedStates.currentCategory)) {
          this.wordNavigation.setCurrentSheetName(parsedStates.currentCategory);
          console.log(`Restored sheet name from localStorage: ${this.wordNavigation.getCurrentSheetName()}`);
        }
      }
    } catch (error) {
      console.error("Error reading sheet name from localStorage:", error);
    }
    
    this.wordNavigation.shuffleCurrentSheet();
    console.log(`VocabularyService initialized with sheet "${this.wordNavigation.getCurrentSheetName()}"`);
  }
  
  // Method to get complete word list - adding this for useVocabularyContainerState
  getWordList(): VocabularyWord[] {
    const currentSheet = this.wordNavigation.getCurrentSheetName();
    if (this.data[currentSheet]) {
      return [...this.data[currentSheet]];
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
  private notifyVocabularyChange(): void {
    this.vocabularyChangeListeners.forEach(listener => listener());
  }
  
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
          this.wordNavigation.setCurrentSheetName("All words");
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
          this.wordNavigation.setCurrentSheetName("All words");
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
  
  hasData(): boolean {
    return Object.values(this.data).some(sheet => sheet && sheet.length > 0);
  }
  
  getLastWordChangeTime(): number {
    return this.wordNavigation.getLastWordChangeTime();
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
    this.notifyVocabularyChange();
  }
}
