
export interface VocabularyWord {
  word: string;
  meaning: string;
  example: string;
  count: number | string; // Updated to accept both number and string types
}

export interface SheetData {
  [key: string]: VocabularyWord[];
}
