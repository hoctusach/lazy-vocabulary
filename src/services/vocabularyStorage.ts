
import { SheetData, VocabularyWord } from "@/types/vocabulary";
import { DEFAULT_VOCABULARY_DATA } from "@/data/defaultVocabulary";

export class VocabularyStorage {
  private readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // Increased to 5MB limit
  private readonly STORAGE_KEY = 'vocabularyData';
  private readonly LAST_UPLOADED_KEY = 'lastUploadedVocabulary';

  loadData(): SheetData {
    // Try to load last uploaded data first
    const lastUploadedData = localStorage.getItem(this.LAST_UPLOADED_KEY);
    if (lastUploadedData) {
      try {
        if (lastUploadedData.length > this.MAX_STORAGE_SIZE) {
          console.warn("Last uploaded data exceeds size limit, trying current session data");
          return this.loadCurrentSessionData();
        }
        const parsedData = JSON.parse(lastUploadedData);
        console.log("Loaded last uploaded vocabulary data", parsedData);
        return this.ensureDataTypes(parsedData);
      } catch (e) {
        console.error("Failed to load last uploaded data, trying current session data:", e);
        return this.loadCurrentSessionData();
      }
    }
    
    return this.loadCurrentSessionData();
  }

  private loadCurrentSessionData(): SheetData {
    const savedData = localStorage.getItem(this.STORAGE_KEY);
    if (savedData) {
      try {
        if (savedData.length > this.MAX_STORAGE_SIZE) {
          console.warn("Saved data exceeds size limit, using default data");
          return this.ensureDataTypes(DEFAULT_VOCABULARY_DATA);
        }
        const parsedData = JSON.parse(savedData);
        console.log("Loaded current session vocabulary data", parsedData);
        return this.ensureDataTypes(parsedData);
      } catch (e) {
        console.error("Failed to load data from localStorage, using default data:", e);
        return this.ensureDataTypes(DEFAULT_VOCABULARY_DATA);
      }
    }
    console.log("No saved data found, using default vocabulary data");
    return this.ensureDataTypes(DEFAULT_VOCABULARY_DATA);
  }

  saveData(data: SheetData): boolean {
    try {
      // Ensure correct types before saving
      const processedData = this.ensureDataTypes(data);
      const dataString = JSON.stringify(processedData);
      
      if (dataString.length > this.MAX_STORAGE_SIZE) {
        throw new Error("Data size exceeds storage limit");
      }
      
      // Save to both current session and last uploaded storage
      localStorage.setItem(this.STORAGE_KEY, dataString);
      localStorage.setItem(this.LAST_UPLOADED_KEY, dataString);
      console.log("Saved vocabulary data to local storage", processedData);
      return true;
    } catch (e) {
      console.error("Failed to save data to localStorage:", e);
      return false;
    }
  }
  
  // Helper method to ensure all fields have the correct types
  private ensureDataTypes(data: any): SheetData {
    const processedData: SheetData = {};
    
    for (const sheetName in data) {
      processedData[sheetName] = [];
      
      if (Array.isArray(data[sheetName])) {
        for (const word of data[sheetName]) {
          const processedWord: VocabularyWord = {
            word: String(word.word || ""),
            meaning: String(word.meaning || ""),
            example: String(word.example || ""),
            count: typeof word.count === 'number' ? word.count : parseInt(String(word.count || "0")) || 0
          };
          
          processedData[sheetName].push(processedWord);
        }
      }
    }
    
    return processedData;
  }
}
