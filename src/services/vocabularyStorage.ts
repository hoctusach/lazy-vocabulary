
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

  // write methods removed for read-only mode
}
