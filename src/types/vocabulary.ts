
export interface VocabularyWord {
  word: string;
  meaning: string;
  example: string;
  count: number | string; // This allows both number and string types
}

export interface SheetData {
  [key: string]: VocabularyWord[];
}
