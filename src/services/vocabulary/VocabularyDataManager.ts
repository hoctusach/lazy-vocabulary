
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

  hasData() {
    return Object.values(this.data).some(sheet => sheet && sheet.length > 0);
  }

  mergeImportedData(importedData) {
    this.importer.mergeImportedData(importedData, this.data);
  }

async loadDefaultVocabulary() {
  // Single source of truth: the copy bundled from src/data/defaultVocabulary.json.
  try {
    console.log("Loading default vocabulary data");
    this.data = this.dataProcessor.processDataTypes(DEFAULT_VOCABULARY_DATA);
    this.notifyVocabularyChange();
    return true;
  } catch (error) {
    console.error("Critical error: Failed to load default vocabulary:", error);
    return false;
  }
}

  // custom word merging removed for read-only mode
}
