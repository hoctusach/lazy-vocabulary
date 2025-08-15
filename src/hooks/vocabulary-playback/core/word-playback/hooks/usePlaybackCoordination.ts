import * as React from 'react';
import { useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';

/**
 * Hook for coordinating the playback execution with all the required dependencies
 */
export const usePlaybackCoordination = (
  findVoice: (region: 'US' | 'UK' | 'AU') => SpeechSynthesisVoice | null,
  selectedVoice: VoiceSelection,
  setIsSpeaking: (isSpeaking: boolean) => void,
  speakingRef: React.MutableRefObject<boolean>,
  resetRetryAttempts: () => void,
  incrementRetryAttempts: () => boolean,
  checkSpeechSupport: () => boolean,
  wordTransitionRef: React.MutableRefObject<boolean>,
  goToNextWord: () => void,
  voicesLoadedRef: React.MutableRefObject<boolean>,
  ensureVoicesLoaded: () => Promise<boolean>,
  paused: boolean,
  muted: boolean
) => {
  const createPlaybackContext = useCallback(() => {
    return {
      findVoice,
      selectedVoice,
      setIsSpeaking,
      speakingRef,
      resetRetryAttempts,
      incrementRetryAttempts,
      checkSpeechSupport,
      wordTransitionRef,
      goToNextWord,
      voicesLoadedRef,
      ensureVoicesLoaded,
      paused,
      muted
    };
  }, [
    findVoice,
    selectedVoice,
    setIsSpeaking,
    speakingRef,
    resetRetryAttempts,
    incrementRetryAttempts,
    checkSpeechSupport,
    wordTransitionRef,
    goToNextWord,
    voicesLoadedRef,
    ensureVoicesLoaded,
    paused,
    muted
  ]);

  return {
    createPlaybackContext
  };
};
