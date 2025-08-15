
import * as React from 'react';
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

/**
 * Silent speech callbacks hook
 */
export const useSpeechCallbacks = (
  speakingRef: React.MutableRefObject<boolean>,
  setIsSpeaking: (isSpeaking: boolean) => void,
  resetRetryAttempts: () => void,
  setPlayInProgress: (inProgress: boolean) => void,
  paused: boolean,
  muted: boolean,
  wordTransitionRef: React.MutableRefObject<boolean>,
  goToNextWord: (fromUser?: boolean) => void,
  scheduleAutoAdvance: (delay: number) => void
) => {
  const createOnStartCallback = useCallback((sessionId: string) => {
    return () => {
      speakingRef.current = true;
      setIsSpeaking(true);
      resetRetryAttempts();
    };
  }, [speakingRef, setIsSpeaking, resetRetryAttempts]);

  const createOnEndCallback = useCallback((sessionId: string) => {
    return () => {
      speakingRef.current = false;
      setIsSpeaking(false);
      setPlayInProgress(false);
      
      // Auto-advance with state validation
      if (!paused && !muted && !wordTransitionRef.current) {
        scheduleAutoAdvance(1500);
      }
    };
  }, [
    speakingRef,
    setIsSpeaking,
    setPlayInProgress,
    paused,
    muted,
    wordTransitionRef,
    scheduleAutoAdvance
  ]);

  return {
    createOnStartCallback,
    createOnEndCallback
  };
};
