
export interface SpeechOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: SpeechSynthesisErrorEvent) => void;
  voiceName?: string;
}
