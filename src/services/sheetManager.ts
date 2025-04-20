
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
      
      // First, copy all sheets from default data to ensure we have all categories
      for (const sheetName of this.sheetOptions) {
        newData[sheetName] = [...(DEFAULT_VOCABULARY_DATA[sheetName] || [])];
      }
      
      // Process sheets found in the uploaded file
      for (const sheetName of workbook.SheetNames) {
        // Skip sheets not in our defined options
        if (!this.sheetOptions.includes(sheetName)) {
          console.warn(`Skipping unknown sheet "${sheetName}" in the uploaded file.`);
          continue;
        }
        
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        if (jsonData.length > 0) {
          // Clear existing default data for this sheet as we're replacing it with imported data
          newData[sheetName] = [];
          
          // Parse each row from the Excel file
          newData[sheetName] = jsonData.map((row: any) => ({
            word: String(row.Word || row.word || ""),
            meaning: String(row.Meaning || row.meaning || ""),
            example: String(row.Examples || row.Example || row.example || ""),
            count: parseInt(String(row.Count || row.count || "0")) || 0
          }));
          
          console.log(`Processed ${newData[sheetName].length} words from "${sheetName}" sheet`);
        }
      }
      
      return newData;
    } catch (e) {
      console.error("Error processing Excel file:", e);
      return null;
    }
  }
}
