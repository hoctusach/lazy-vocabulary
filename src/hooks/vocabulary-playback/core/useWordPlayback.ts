
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '../useVoiceSelection';
import { useWordPlaybackCore } from './word-playback';

/**
 * Hook for managing word playback functionality
 * This is a wrapper around the refactored core implementation
 */
export const useWordPlayback = (
  wordList: VocabularyWord[],
  currentIndex: number,
  setCurrentIndex: (index: number | ((prevIndex: number) => number)) => void,
  muted: boolean,
  paused: boolean,
  cancelSpeech: () => void,
  findVoice: (region: 'US' | 'UK' | 'AU') => SpeechSynthesisVoice | null,
  selectedVoice: VoiceSelection,
  userInteractionRef: React.MutableRefObject<boolean>,
  setIsSpeaking: (isSpeaking: boolean) => void,
  speakingRef: React.MutableRefObject<boolean>,
  resetRetryAttempts: () => void,
  incrementRetryAttempts: () => boolean,
  checkSpeechSupport: () => boolean
) => {
  // Use our refactored core implementation
  return useWordPlaybackCore(
    wordList,
    currentIndex,
    setCurrentIndex,
    muted,
    paused,
    cancelSpeech,
    findVoice,
    selectedVoice,
    userInteractionRef,
    setIsSpeaking,
    speakingRef,
    resetRetryAttempts,
    incrementRetryAttempts,
    checkSpeechSupport
  );
};
