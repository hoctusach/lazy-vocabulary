
import { SheetData } from "@/types/vocabulary";
import { DEFAULT_VOCABULARY_DATA } from "@/data/defaultVocabulary";
import { STORAGE_CONFIG } from "./vocabulary/storage/StorageConfig";
import { DataValidator } from "./vocabulary/storage/DataValidator";

export class VocabularyStorage {
  private readonly config = STORAGE_CONFIG;
  private readonly validator = new DataValidator();

  /**
   * Loads vocabulary data from local storage
   */
  loadData(): SheetData {
    // Try to load last uploaded data first
    const lastUploadedData = localStorage.getItem(this.config.LAST_UPLOADED_KEY);
    if (lastUploadedData) {
      try {
        if (!this.validator.validateDataSize(lastUploadedData, this.config.MAX_STORAGE_SIZE)) {
          console.warn("Last uploaded data exceeds size limit, trying current session data");
          return this.loadCurrentSessionData();
        }
        const parsedData = JSON.parse(lastUploadedData);
        console.log("Loaded last uploaded vocabulary data", parsedData);
        return this.validator.ensureDataTypes(parsedData);
      } catch (e) {
        console.error("Failed to load last uploaded data, trying current session data:", e);
        return this.loadCurrentSessionData();
      }
    }
    
    return this.loadCurrentSessionData();
  }

  /**
   * Loads data from the current session storage
   */
  private loadCurrentSessionData(): SheetData {
    const savedData = localStorage.getItem(this.config.STORAGE_KEY);
    if (savedData) {
      try {
        if (!this.validator.validateDataSize(savedData, this.config.MAX_STORAGE_SIZE)) {
          console.warn("Saved data exceeds size limit, using default data");
          return this.validator.getDefaultData();
        }
        const parsedData = JSON.parse(savedData);
        console.log("Loaded current session vocabulary data", parsedData);
        return this.validator.ensureDataTypes(parsedData);
      } catch (e) {
        console.error("Failed to load data from localStorage, using default data:", e);
        return this.validator.getDefaultData();
      }
    }
    console.log("No saved data found, using default vocabulary data");
    return this.validator.getDefaultData();
  }

  /**
   * Saves vocabulary data to local storage
   */
  saveData(data: SheetData): boolean {
    try {
      // Convert SheetData to the format expected by ensureDataTypes
      const convertedData: Record<string, Array<Record<string, unknown>>> = {};
      for (const [sheetName, words] of Object.entries(data)) {
        convertedData[sheetName] = words.map(word => ({
          word: word.word,
          meaning: word.meaning,
          example: word.example,
          count: word.count,
          category: word.category
        }));
      }
      
      // Ensure correct types before saving
      const processedData = this.validator.ensureDataTypes(convertedData);
      const dataString = JSON.stringify(processedData);
      
      if (!this.validator.validateDataSize(dataString, this.config.MAX_STORAGE_SIZE)) {
        throw new Error("Data size exceeds storage limit");
      }
      
      // Save to both current session and last uploaded storage
      localStorage.setItem(this.config.STORAGE_KEY, dataString);
      localStorage.setItem(this.config.LAST_UPLOADED_KEY, dataString);
      console.log("Saved vocabulary data to local storage", processedData);
      return true;
    } catch (e) {
      console.error("Failed to save data to localStorage:", e);
      return false;
    }
  }
}
