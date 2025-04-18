
export interface VocabularyWord {
  word: string;
  meaning: string;
  example: string;
  count: number;
}

export interface SheetData {
  [key: string]: VocabularyWord[];
}
