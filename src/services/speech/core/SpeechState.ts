
import { VocabularyWord } from '@/types/vocabulary';

export interface SpeechState {
  isActive: boolean;
  isPaused: boolean;
  isMuted: boolean;
  currentWord: VocabularyWord | null;
  currentUtterance: SpeechSynthesisUtterance | null;
}

export type StateChangeListener = (state: SpeechState) => void;
