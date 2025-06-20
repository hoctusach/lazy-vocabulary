
export interface SpeechOptions {
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: SpeechSynthesisErrorEvent) => void;
  allowOverride?: boolean;
}

export interface SpeechState {
  currentUtterance: SpeechSynthesisUtterance | null;
  currentSpeechId: string | null;
  isActive: boolean;
  speechStarted: boolean;
  speechEnded: boolean;
  isPausedByUser: boolean;
  pausedText: string | null;
  pausedOptions: SpeechOptions | null;
}

export interface PausedContent {
  text: string | null;
  options: SpeechOptions | null;
}
