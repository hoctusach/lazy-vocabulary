
export interface SpeechOptions {
  voiceRegion?: 'US' | 'UK' | 'AU';
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}
