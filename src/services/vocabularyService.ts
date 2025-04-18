import * as XLSX from 'xlsx';

export interface VocabularyWord {
  word: string;
  meaning: string;
  example: string;
  count: number;
}

export interface SheetData {
  [key: string]: VocabularyWord[];
}

// Add a default dataset that will be used if no file is uploaded
const DEFAULT_VOCABULARY_DATA: SheetData = {
  "All words": [
    { 
      word: "Serendipity", 
      meaning: "A fortunate discovery by accident", 
      example: "Finding that book was pure serendipity.", 
      count: 0 
    },
    { 
      word: "Ephemeral", 
      meaning: "Lasting for a very short time", 
      example: "Social media trends are ephemeral.", 
      count: 0 
    },
    // Add more default words here
  ],
  "phrasal verbs": [
    { 
      word: "Give up", 
      meaning: "Stop trying", 
      example: "Don't give up on your dreams.", 
      count: 0 
    }
  ],
  "idioms": [
    { 
      word: "Bite the bullet", 
      meaning: "Do something difficult or unpleasant", 
      example: "I had to bite the bullet and study for the exam.", 
      count: 0 
    }
  ],
  "advanced words": [
    { 
      word: "Ubiquitous", 
      meaning: "Present, appearing, or found everywhere", 
      example: "Smartphones are ubiquitous in modern society.", 
      count: 0 
    }
  ]
};

class VocabularyService {
  private data: SheetData = DEFAULT_VOCABULARY_DATA;
  private currentSheetName: string = "All words";
  private shuffledIndices: number[] = [];
  private currentIndex: number = -1;
  
  // Sheet options from the original app
  readonly sheetOptions = ["All words", "phrasal verbs", "idioms", "advanced words"];
  
  constructor() {
    // First, try to load from localStorage
    const savedData = localStorage.getItem('vocabularyData');
    if (savedData) {
      try {
        this.data = JSON.parse(savedData);
      } catch (e) {
        console.error("Failed to load data from localStorage, using default data:", e);
      }
    }
    this.shuffleCurrentSheet();
  }
  
  private loadFromLocalStorage() {
    const savedData = localStorage.getItem('vocabularyData');
    if (savedData) {
      try {
        this.data = JSON.parse(savedData);
        this.shuffleCurrentSheet();
      } catch (e) {
        console.error("Failed to load data from localStorage:", e);
      }
    }
  }
  
  private saveToLocalStorage() {
    try {
      localStorage.setItem('vocabularyData', JSON.stringify(this.data));
    } catch (e) {
      console.error("Failed to save data to localStorage:", e);
    }
  }
  
  // Modify processExcelFile to work with default data if needed
  async processExcelFile(file: File): Promise<boolean> {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      const newData: SheetData = {};
      
      // Process each sheet
      for (const sheetName of this.sheetOptions) {
        if (workbook.SheetNames.includes(sheetName)) {
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          
          newData[sheetName] = jsonData.map((row: any) => ({
            word: row.Word || "",
            meaning: row.Meaning || "",
            example: row.Examples || "",
            count: parseInt(row.Count) || 0
          }));
        } else {
          console.warn(`Sheet "${sheetName}" not found in the uploaded file. Using default data.`);
          newData[sheetName] = DEFAULT_VOCABULARY_DATA[sheetName] || [];
        }
      }
      
      this.data = newData;
      this.saveToLocalStorage();
      this.shuffleCurrentSheet();
      return true;
    } catch (e) {
      console.error("Error processing Excel file:", e);
      return false;
    }
  }
  
  getCurrentSheetName(): string {
    return this.currentSheetName;
  }
  
  switchSheet(sheetName: string): boolean {
    if (this.sheetOptions.includes(sheetName)) {
      this.currentSheetName = sheetName;
      this.shuffleCurrentSheet();
      return true;
    }
    return false;
  }
  
  nextSheet(): string {
    const currentIndex = this.sheetOptions.indexOf(this.currentSheetName);
    const nextIndex = (currentIndex + 1) % this.sheetOptions.length;
    this.currentSheetName = this.sheetOptions[nextIndex];
    this.shuffleCurrentSheet();
    return this.currentSheetName;
  }
  
  private shuffleCurrentSheet() {
    const currentData = this.data[this.currentSheetName] || [];
    if (currentData.length === 0) return;
    
    this.shuffledIndices = Array.from({ length: currentData.length }, (_, i) => i);
    
    // Fisher-Yates shuffle
    for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledIndices[i], this.shuffledIndices[j]] = [this.shuffledIndices[j], this.shuffledIndices[i]];
    }
    
    this.currentIndex = -1;
  }
  
  getCurrentWord(): VocabularyWord | null {
    const currentData = this.data[this.currentSheetName] || [];
    if (currentData.length === 0 || this.shuffledIndices.length === 0) return null;
    
    if (this.currentIndex >= 0 && this.currentIndex < this.shuffledIndices.length) {
      const wordIndex = this.shuffledIndices[this.currentIndex];
      return currentData[wordIndex];
    }
    
    return null;
  }
  
  getNextWord(): VocabularyWord | null {
    const currentData = this.data[this.currentSheetName] || [];
    if (currentData.length === 0 || this.shuffledIndices.length === 0) return null;
    
    this.currentIndex = (this.currentIndex + 1) % this.shuffledIndices.length;
    const wordIndex = this.shuffledIndices[this.currentIndex];
    
    if (wordIndex !== undefined && currentData[wordIndex]) {
      // Update count
      currentData[wordIndex].count = (currentData[wordIndex].count || 0) + 1;
      this.saveToLocalStorage();
      return currentData[wordIndex];
    }
    
    return null;
  }
  
  hasData(): boolean {
    return Object.values(this.data).some(sheet => sheet.length > 0);
  }
}

export const vocabularyService = new VocabularyService();
