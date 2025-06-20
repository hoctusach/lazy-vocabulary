
export interface UnifiedSpeechState {
  isActive: boolean;
  audioUnlocked: boolean;
  phase: 'idle' | 'speaking' | 'paused';
  currentUtterance: SpeechSynthesisUtterance | null;
}

export interface SpeechState extends UnifiedSpeechState {
  isPaused: boolean;
  isMuted: boolean;
  currentWord: any;
}

export interface ExtendedSpeechState extends UnifiedSpeechState {
  isPaused: boolean;
  isMuted: boolean;
  currentWord: any;
}
