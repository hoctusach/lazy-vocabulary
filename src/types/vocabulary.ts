

export interface VocabularyWord {
  word: string;
  meaning: string;
  example: string;
  translation?: string;
  count: number | string; // This allows both number and string types
  category?: string; // Making category optional to support existing default vocabulary data
  nextAllowedTime?: string;
}

export type ReadonlyWord = Readonly<VocabularyWord>;

// Interface for editing or adding words where category is required
export interface SheetData {
  [key: string]: VocabularyWord[];
}
