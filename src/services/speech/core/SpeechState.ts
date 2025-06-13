
import { VocabularyWord } from '@/types/vocabulary';

export type SpeechPhase = 'idle' | 'preparing' | 'speaking' | 'finished';

export interface SpeechState {
  phase: SpeechPhase;
  isActive: boolean;
  isPaused: boolean;
  isMuted: boolean;
  currentWord: VocabularyWord | null;
  currentUtterance: SpeechSynthesisUtterance | null;
}

export type StateChangeListener = (state: SpeechState) => void;
