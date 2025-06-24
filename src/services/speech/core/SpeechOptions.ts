
export interface SpeechOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}
