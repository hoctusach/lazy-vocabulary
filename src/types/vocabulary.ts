

export interface VocabularyWord {
  word: string;
  meaning: string;
  example: string;
  translation?: string;
  count: number | string; // This allows both number and string types
  category?: string; // Making category optional to support existing default vocabulary data
}

// Interface for editing or adding words where category is required
export interface EditableWord {
  word: string;
  meaning: string;
  example: string;
  translation?: string;
  category: string; // Category is required for editable words
  count?: number | string;
}

export interface SheetData {
  [key: string]: VocabularyWord[];
}
