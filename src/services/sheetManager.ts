
import { SheetData, VocabularyWord } from "@/types/vocabulary";
import * as XLSX from 'xlsx';
import { DEFAULT_VOCABULARY_DATA } from "@/data/defaultVocabulary";

export class SheetManager {
  readonly sheetOptions = ["All words", "phrasal verbs", "idioms", "advanced words"];

  async processExcelFile(file: File): Promise<SheetData | null> {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const newData: SheetData = {};
      
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
      
      return newData;
    } catch (e) {
      console.error("Error processing Excel file:", e);
      return null;
    }
  }
}
