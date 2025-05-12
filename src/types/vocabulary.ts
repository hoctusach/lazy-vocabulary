
import { SpeechSynthesisVoice } from './speech';

export interface VocabularyWord {
  word: string;
  meaning: string;
  example: string;
  count: number | string; // This allows both number and string types
  category?: string; // Making category optional to support existing default vocabulary data
  // Spaced repetition fields
  interval?: number;      // days until next review  
  easeFactor?: number;    // growth rate, default 2.5  
  nextDue?: string;       // ISO date string of next review  
}

// Interface for editing or adding words where category is required
export interface EditableWord {
  word: string;
  meaning: string;
  example: string;
  category: string; // Category is required for editable words
  count?: number | string;
}

export interface SheetData {
  [key: string]: VocabularyWord[];
}

// Re-export the SpeechSynthesisVoice type
export type { SpeechSynthesisVoice };
