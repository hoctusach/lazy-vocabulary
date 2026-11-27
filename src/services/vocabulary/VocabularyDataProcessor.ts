
import { SheetData, VocabularyWord } from "@/types/vocabulary";
import { normalizeCategory } from "@/data/defaultVocabulary";

export class VocabularyDataProcessor {
  constructor() {}

  processDataTypes(data: any): SheetData {
    const processedData: SheetData = {};
    
    for (const rawSheetName in data) {
      // 'phrases, collocation' -> 'phrases, collocations' whatever the source
      const sheetName = normalizeCategory(rawSheetName) as string;
      processedData[sheetName] = processedData[sheetName] ?? [];
      
      if (Array.isArray(data[rawSheetName])) {
        for (const word of data[rawSheetName]) {
          // Ensure all fields are properly typed and add default category if missing
          processedData[sheetName].push({
            word: String(word.word || ""),
            meaning: String(word.meaning || ""),
            example: String(word.example || ""),
            translation: String(word.translation || ""),
            count: word.count !== undefined ? word.count : 0,
            category: normalizeCategory(word.category) || sheetName // Use sheet name as default category
          });
        }
      }
    }
    
    return processedData;
  }
  
  getHigherCount(count1: string | number, count2: string | number): string | number {
    const num1 = typeof count1 === 'string' ? parseInt(count1, 10) || 0 : count1 || 0;
    const num2 = typeof count2 === 'string' ? parseInt(count2, 10) || 0 : count2 || 0;
    
    return Math.max(num1, num2);
  }
}
