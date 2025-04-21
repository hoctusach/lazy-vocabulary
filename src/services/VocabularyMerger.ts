
import { SheetData, VocabularyWord } from "@/types/vocabulary";
import { DEFAULT_VOCABULARY_DATA } from "@/data/defaultVocabulary";

export class VocabularyMerger {
  static mergeImportedData(currentData: SheetData, importedData: SheetData, sheetOptions: string[]): SheetData {
    const data = { ...currentData };

    // Merge each sheet
    for (const sheetName in importedData) {
      if (!data[sheetName]) data[sheetName] = [];
      let updatedWords = 0;
      let newWords = 0;
      for (const importedWord of importedData[sheetName]) {
        if (!importedWord.word || importedWord.word.trim() === "") continue;
        const processedWord: VocabularyWord = {
          word: String(importedWord.word),
          meaning: String(importedWord.meaning || ""),
          example: String(importedWord.example || ""),
          count: typeof importedWord.count === 'number' ? importedWord.count : parseInt(String(importedWord.count || "0")) || 0,
        };
        const existingWordIndex = data[sheetName].findIndex(w => w.word.toLowerCase() === processedWord.word.toLowerCase());
        if (existingWordIndex >= 0) {
          data[sheetName][existingWordIndex] = {
            ...processedWord,
            count: Math.max(processedWord.count || 0, data[sheetName][existingWordIndex].count || 0),
          };
          updatedWords++;
        } else {
          data[sheetName].push(processedWord);
          newWords++;
        }
      }
    }
    return this.regenerateAllWordsSheet(data, sheetOptions);
  }

  static regenerateAllWordsSheet(data: SheetData, sheetOptions: string[]): SheetData {
    const allWordsMap = new Map<string, VocabularyWord>();
    if (data["All words"]) {
      for (const word of data["All words"]) {
        if (word.word && word.word.trim() !== "") {
          allWordsMap.set(word.word.toLowerCase(), { ...word });
        }
      }
    }
    for (const sheetName of sheetOptions) {
      if (sheetName === "All words") continue;
      for (const word of (data[sheetName] || [])) {
        if (!word.word || word.word.trim() === "") continue;
        const lowercaseWord = word.word.toLowerCase();
        if (allWordsMap.has(lowercaseWord)) {
          const existingWord = allWordsMap.get(lowercaseWord)!;
          if ((word.count || 0) > (existingWord.count || 0)) {
            existingWord.count = word.count;
          }
        } else {
          allWordsMap.set(lowercaseWord, { ...word });
        }
      }
    }
    data["All words"] = Array.from(allWordsMap.values());
    return data;
  }
}
