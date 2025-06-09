
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

/**
 * Hook for managing speech synthesis callbacks (onStart, onEnd, onError)
 */
export const useSpeechCallbacks = (
  speakingRef: React.MutableRefObject<boolean>,
  setIsSpeaking: (isSpeaking: boolean) => void,
  resetRetryAttempts: () => void,
  setPlayInProgress: (inProgress: boolean) => void,
  paused: boolean,
  muted: boolean,
  wordTransitionRef: React.MutableRefObject<boolean>,
  goToNextWord: () => void
) => {
  const createOnStartCallback = useCallback((sessionId: string) => {
    return () => {
      console.log(`[SPEECH-CALLBACKS-${sessionId}] ✓ Speech started successfully`);
      speakingRef.current = true;
      setIsSpeaking(true);
      resetRetryAttempts(); // Reset on successful start
    };
  }, [speakingRef, setIsSpeaking, resetRetryAttempts]);

  const createOnEndCallback = useCallback((sessionId: string) => {
    return () => {
      console.log(`[SPEECH-CALLBACKS-${sessionId}] ✓ Speech completed successfully`);
      speakingRef.current = false;
      setIsSpeaking(false);
      setPlayInProgress(false);
      
      // Auto-advance with state validation
      if (!paused && !muted && !wordTransitionRef.current) {
        console.log(`[SPEECH-CALLBACKS-${sessionId}] Auto-advancing to next word`);
        setTimeout(() => {
          // Double-check state before advancing
          if (!paused && !muted && !wordTransitionRef.current) {
            goToNextWord();
          } else {
            console.log(`[SPEECH-CALLBACKS-${sessionId}] State changed during delay, not advancing`);
          }
        }, 1500);
      } else {
        console.log(`[SPEECH-CALLBACKS-${sessionId}] Not auto-advancing due to state`);
      }
    };
  }, [
    speakingRef,
    setIsSpeaking,
    setPlayInProgress,
    paused,
    muted,
    wordTransitionRef,
    goToNextWord
  ]);

  return {
    createOnStartCallback,
    createOnEndCallback
  };
};
