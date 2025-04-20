
import { SheetData, VocabularyWord } from "@/types/vocabulary";
import * as XLSX from 'xlsx';
import { DEFAULT_VOCABULARY_DATA } from "@/data/defaultVocabulary";

export class SheetManager {
  readonly sheetOptions = ["All words", "phrasal verbs", "idioms", "advanced words"];

  async processExcelFile(file: File): Promise<SheetData | null> {
    try {
      console.log("Starting Excel file processing");
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const newData: SheetData = {};
      
      // First, copy all sheets from default data to ensure we have all categories
      for (const sheetName of this.sheetOptions) {
        newData[sheetName] = [...(DEFAULT_VOCABULARY_DATA[sheetName] || [])];
        console.log(`Initialized sheet "${sheetName}" with ${newData[sheetName].length} default words`);
      }
      
      console.log(`Processing ${workbook.SheetNames.length} sheets from uploaded file`);
      
      // Process sheets found in the uploaded file
      for (const sheetName of workbook.SheetNames) {
        const normalizedSheetName = this.normalizeSheetName(sheetName);
        
        // Skip sheets not in our defined options after normalization
        if (!this.sheetOptions.includes(normalizedSheetName)) {
          console.warn(`Skipping unknown sheet "${sheetName}" (normalized: "${normalizedSheetName}") in the uploaded file.`);
          continue;
        }
        
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        if (jsonData.length > 0) {
          console.log(`Found ${jsonData.length} entries in sheet "${sheetName}" (using as "${normalizedSheetName}")`);
          
          // Parse each row from the Excel file with improved column handling
          const processedWords = this.processSheetRows(jsonData);
          
          // Merge with existing words (don't override all defaults)
          this.mergeWords(newData[normalizedSheetName], processedWords);
          
          console.log(`Processed ${processedWords.length} words from "${normalizedSheetName}" sheet`);
          console.log(`Sheet "${normalizedSheetName}" now has ${newData[normalizedSheetName].length} words total`);
        } else {
          console.log(`Sheet "${sheetName}" is empty, keeping default data`);
        }
      }
      
      // Add "All words" collection by combining all other sheets
      this.generateAllWordsSheet(newData);
      
      console.log("Excel processing complete with", 
        Object.keys(newData).map(key => `${key}: ${newData[key].length} words`).join(", "));
      
      return newData;
    } catch (e) {
      console.error("Error processing Excel file:", e);
      return null;
    }
  }
  
  // Normalize sheet names to match our expected format
  private normalizeSheetName(name: string): string {
    const normalized = name.toLowerCase().trim();
    
    if (normalized === "all" || normalized === "all words") return "All words";
    if (normalized.includes("phrasal") || normalized.includes("verb")) return "phrasal verbs";
    if (normalized.includes("idiom")) return "idioms";
    if (normalized.includes("advanced")) return "advanced words";
    
    // Default to original name if no match
    return name;
  }
  
  // Process rows with improved column name handling
  private processSheetRows(jsonData: any[]): VocabularyWord[] {
    return jsonData.map((row: any) => {
      // Find the word column (try different possible names)
      const wordValue = this.findValueByPossibleKeys(row, [
        'Word', 'word', 'WORD', 'Vocabulary', 'vocabulary', 'Term', 'term'
      ]);
      
      // Find the meaning column
      const meaningValue = this.findValueByPossibleKeys(row, [
        'Meaning', 'meaning', 'MEANING', 'Definition', 'definition', 'Translation', 'translation'
      ]);
      
      // Find the example column
      const exampleValue = this.findValueByPossibleKeys(row, [
        'Examples', 'Example', 'example', 'examples', 'EXAMPLE', 'EXAMPLES', 'Usage', 'usage', 'Sentence', 'sentence'
      ]);
      
      // Find the count column
      const countValue = this.findValueByPossibleKeys(row, [
        'Count', 'count', 'COUNT', 'Views', 'views', 'Frequency', 'frequency'
      ]);
      
      return {
        word: String(wordValue || ""),
        meaning: String(meaningValue || ""),
        example: String(exampleValue || ""),
        count: parseInt(String(countValue || "0")) || 0
      };
    }).filter(word => word.word.trim() !== ""); // Filter out empty words
  }
  
  private findValueByPossibleKeys(obj: any, keys: string[]): any {
    for (const key of keys) {
      if (obj[key] !== undefined) {
        return obj[key];
      }
    }
    return "";
  }
  
  // Merge new words with existing words, updating duplicates
  private mergeWords(existingWords: VocabularyWord[], newWords: VocabularyWord[]): void {
    for (const newWord of newWords) {
      if (!newWord.word || newWord.word.trim() === "") continue;
      
      // Check if word already exists (case-insensitive)
      const existingIndex = existingWords.findIndex(
        existing => existing.word.toLowerCase() === newWord.word.toLowerCase()
      );
      
      if (existingIndex >= 0) {
        // Update existing word
        existingWords[existingIndex] = newWord;
      } else {
        // Add new word
        existingWords.push(newWord);
      }
    }
  }
  
  // Generate "All words" sheet by combining all other sheets
  private generateAllWordsSheet(data: SheetData): void {
    // Start with existing "All words" data
    const allWords = data["All words"] || [];
    const seenWords = new Set(allWords.map(w => w.word.toLowerCase()));
    
    // Add words from other sheets that aren't already in "All words"
    for (const sheetName of this.sheetOptions) {
      if (sheetName === "All words") continue;
      
      for (const word of data[sheetName] || []) {
        const lowercaseWord = word.word.toLowerCase();
        
        if (!seenWords.has(lowercaseWord)) {
          allWords.push(word);
          seenWords.add(lowercaseWord);
        }
      }
    }
    
    // Update the "All words" sheet
    data["All words"] = allWords;
    console.log(`Updated "All words" sheet, now contains ${allWords.length} total words`);
  }
}
