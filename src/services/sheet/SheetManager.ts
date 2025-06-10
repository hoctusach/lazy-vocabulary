
import { SheetData } from "@/types/vocabulary";
import * as XLSX from 'xlsx';
import { SheetProcessor } from "./SheetProcessor";
import { SheetNormalizer } from "./SheetNormalizer";

export class SheetManager {
  readonly sheetOptions = ["phrasal verbs", "idioms", "advanced words"];
  private sheetProcessor: SheetProcessor;
  private sheetNormalizer: SheetNormalizer;

  constructor() {
    this.sheetProcessor = new SheetProcessor();
    this.sheetNormalizer = new SheetNormalizer(this.sheetOptions);
  }

  async processExcelFile(file: File): Promise<SheetData | null> {
    try {
      console.log("Starting Excel file processing");
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const newData: SheetData = {};
      
      // Initialize only the valid sheet categories (no "All words")
      for (const sheetName of this.sheetOptions) {
        newData[sheetName] = [];
        console.log(`Initialized sheet "${sheetName}"`);
      }
      
      console.log(`Processing ${workbook.SheetNames.length} sheets from uploaded file`);
      
      // Process sheets found in the uploaded file
      for (const sheetName of workbook.SheetNames) {
        const normalizedSheetName = this.sheetNormalizer.normalizeSheetName(sheetName);
        
        // Skip sheets not in our defined options after normalization
        if (!this.sheetOptions.includes(normalizedSheetName)) {
          console.warn(`Skipping unknown sheet "${sheetName}" (normalized: "${normalizedSheetName}") in the uploaded file.`);
          continue;
        }
        
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        if (jsonData.length > 0) {
          console.log(`Found ${jsonData.length} entries in sheet "${sheetName}" (using as "${normalizedSheetName}")`);
          
          // Process each row from the Excel file with improved column handling
          const processedWords = this.sheetProcessor.processSheetRows(jsonData);
          
          // Merge with existing words
          this.sheetProcessor.mergeWords(newData[normalizedSheetName], processedWords);
          
          console.log(`Processed ${processedWords.length} words from "${normalizedSheetName}" sheet`);
          console.log(`Sheet "${normalizedSheetName}" now has ${newData[normalizedSheetName].length} words total`);
        } else {
          console.log(`Sheet "${sheetName}" is empty`);
        }
      }
      
      console.log("Excel processing complete with", 
        Object.keys(newData).map(key => `${key}: ${newData[key].length} words`).join(", "));
      
      return newData;
    } catch (e) {
      console.error("Error processing Excel file:", e);
      return null;
    }
  }
}
