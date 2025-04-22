
// Define the built-in SpeechSynthesisVoice interface type
export interface SpeechSynthesisVoice {
  default: boolean;
  lang: string;
  localService: boolean;
  name: string;
  voiceURI: string;
}

// Speech settings configuration
export interface SpeechSettings {
  rate: number;
  pitch: number;
  volume: number;
}
