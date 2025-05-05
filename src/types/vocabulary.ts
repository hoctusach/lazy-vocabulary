
import { SpeechSynthesisVoice } from './speech';

export interface VocabularyWord {
  word: string;
  meaning: string;
  example: string;
  count: number | string; // This allows both number and string types
  category?: string; // Category remains optional for backward compatibility with existing data
}

export interface SheetData {
  [key: string]: VocabularyWord[];
}

// Re-export the SpeechSynthesisVoice type
export type { SpeechSynthesisVoice };
