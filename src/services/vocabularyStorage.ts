
import { SheetData } from "@/types/vocabulary";
import { DEFAULT_VOCABULARY_DATA } from "@/data/defaultVocabulary";

export class VocabularyStorage {
  private readonly MAX_STORAGE_SIZE = 1024 * 1024; // 1MB limit
  private readonly STORAGE_KEY = 'vocabularyData';

  loadData(): SheetData {
    const savedData = localStorage.getItem(this.STORAGE_KEY);
    if (savedData) {
      try {
        if (savedData.length > this.MAX_STORAGE_SIZE) {
          console.warn("Saved data exceeds size limit, using default data");
          return DEFAULT_VOCABULARY_DATA;
        }
        return JSON.parse(savedData);
      } catch (e) {
        console.error("Failed to load data from localStorage, using default data:", e);
        return DEFAULT_VOCABULARY_DATA;
      }
    }
    return DEFAULT_VOCABULARY_DATA;
  }

  saveData(data: SheetData): boolean {
    try {
      const dataString = JSON.stringify(data);
      if (dataString.length > this.MAX_STORAGE_SIZE) {
        throw new Error("Data size exceeds storage limit");
      }
      localStorage.setItem(this.STORAGE_KEY, dataString);
      return true;
    } catch (e) {
      console.error("Failed to save data to localStorage:", e);
      return false;
    }
  }
}
