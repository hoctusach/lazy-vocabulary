
import { SheetData } from "@/types/vocabulary";
import { DEFAULT_VOCABULARY_DATA } from "@/data/defaultVocabulary";

export class VocabularyLoader {
  static processDataTypes(data: any): SheetData {
    const processedData: SheetData = {};
    for (const sheetName in data) {
      processedData[sheetName] = [];
      if (Array.isArray(data[sheetName])) {
        for (const word of data[sheetName]) {
          processedData[sheetName].push({
            word: String(word.word || ""),
            meaning: String(word.meaning || ""),
            example: String(word.example || ""),
            count: typeof word.count === 'number' ? word.count : parseInt(String(word.count || "0")) || 0
          });
        }
      }
    }
    return processedData;
  }

  static async loadDefaultVocabulary(
    setData: (data: SheetData) => void,
    setSheetName: (name: string) => void,
    shuffleSheet: () => void,
    dataOverride?: SheetData
  ): Promise<boolean> {
    try {
      const response = await fetch('/defaultVocabulary.json');
      if (!response.ok) throw new Error(`Failed with status ${response.status}`);
      const fetchedData = await response.json();
      setData(this.processDataTypes(fetchedData));
      setSheetName("All words");
      shuffleSheet();
      return true;
    } catch {
      // fallback to built-in static
      const vocabularyData = dataOverride || DEFAULT_VOCABULARY_DATA;
      setData(this.processDataTypes(JSON.parse(JSON.stringify(vocabularyData))));
      setSheetName("All words");
      shuffleSheet();
      return true;
    }
  }
}
