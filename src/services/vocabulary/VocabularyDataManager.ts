
import { VocabularyStorage } from "../vocabularyStorage";
import { VocabularyDataProcessor } from "./VocabularyDataProcessor";
import { VocabularyImporter } from "./VocabularyImporter";
import { DEFAULT_VOCABULARY_DATA } from "@/data/defaultVocabulary";
export class VocabularyDataManager {
  constructor() {
    this.storage = new VocabularyStorage();
    this.data = this.storage.loadData();
    this.dataProcessor = new VocabularyDataProcessor();
    this.importer = new VocabularyImporter(this.storage);
    this.vocabularyChangeListeners = [];
  }

  getData() {
    return this.data;
  }

  setData(data) {
    this.data = data;
  }

  // Method to get complete word list for useVocabularyContainerState
  getWordList(sheetName) {
    if (this.data[sheetName]) {
      return [...this.data[sheetName]];
    }
    return [];
  }

  // Method to add a vocabulary change listener
  addVocabularyChangeListener(listener) {
    this.vocabularyChangeListeners.push(listener);
  }

  // Method to remove a vocabulary change listener
  removeVocabularyChangeListener(listener) {
    this.vocabularyChangeListeners = this.vocabularyChangeListeners.filter(l => l !== listener);
  }

  // Method to notify all listeners about vocabulary change
  notifyVocabularyChange() {
    this.vocabularyChangeListeners.forEach(listener => listener());
  }

  getTotalWordCount() {
    let count = 0;
    for (const sheetName in this.data) {
      count += this.data[sheetName]?.length || 0;
    }
    return count;
  }

  saveData() {
    return this.storage.saveData(this.data);
  }

  hasData() {
    return Object.values(this.data).some(sheet => sheet && sheet.length > 0);
  }

  mergeImportedData(importedData) {
    this.importer.mergeImportedData(importedData, this.data);
  }

async loadDefaultVocabulary() {
  try {
    console.log("Loading default vocabulary data");
    try {
      const response = await fetch("/defaultVocabulary.json");
      if (!response.ok) throw new Error(`Failed to fetch default vocabulary: ${response.status}`);
      const fetchedData = await response.json();
      this.data = this.dataProcessor.processDataTypes(fetchedData);
      this.storage.saveData(this.data);
      this.notifyVocabularyChange();
    } catch (error) {
      console.warn("Failed to load from JSON file, using embedded default data:", error);
      this.data = this.dataProcessor.processDataTypes(DEFAULT_VOCABULARY_DATA);
      this.storage.saveData(this.data);
      this.notifyVocabularyChange();
    }
    return true;
  } catch (error) {
    console.error("Failed to load default vocabulary:", error);
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

  mergeCustomWords(customData, sheetOptions) {
    console.log("Merging custom words with existing data");

    // Add each custom category to sheetOptions if it doesn't exist already
    for (const category in customData) {
      if (!sheetOptions.includes(category)) {
        sheetOptions.push(category);
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
