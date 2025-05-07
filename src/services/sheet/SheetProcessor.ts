
import { SheetData, VocabularyWord } from "@/types/vocabulary";

export class SheetProcessor {
  // Process rows with improved column name handling and type conversion
  processSheetRows(jsonData: any[]): VocabularyWord[] {
    return jsonData.map((row: any) => {
      // Find the word column (try different possible keys)
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
      
      // Ensure proper types for all fields
      return {
        word: String(wordValue || ""),
        meaning: String(meaningValue || ""),
        example: String(exampleValue || ""),
        count: typeof countValue === 'number' ? countValue : parseInt(String(countValue || "0")) || 0
      };
    }).filter(word => word.word.trim() !== ""); // Filter out empty words
  }
  
  // Helper method to find values by possible column names
  findValueByPossibleKeys(obj: any, keys: string[]): any {
    for (const key of keys) {
      if (obj[key] !== undefined) {
        return obj[key];
      }
    }
    return "";
  }
  
  // Merge new words with existing words, updating duplicates
  mergeWords(existingWords: VocabularyWord[], newWords: VocabularyWord[]): void {
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
  generateAllWordsSheet(data: SheetData, sheetOptions: string[]): void {
    // Start with existing "All words" data
    const allWords = data["All words"] || [];
    const seenWords = new Set(allWords.map(w => w.word.toLowerCase()));
    
    // Add words from other sheets that aren't already in "All words"
    for (const sheetName of sheetOptions) {
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
