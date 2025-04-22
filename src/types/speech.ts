
// Re-export the built-in SpeechSynthesisVoice type for use throughout the app
export type { SpeechSynthesisVoice } from './vocabulary';

// Speech settings configuration
export interface SpeechSettings {
  rate: number;
  pitch: number;
  volume: number;
}
