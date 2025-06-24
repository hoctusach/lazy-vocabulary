import * as React from 'react';
import { useState, useCallback } from 'react';

/**
 * Silent speech error handler hook
 */
export const useSpeechErrorHandler = (
  incrementRetryAttempts: () => boolean,
  goToNextWord: (fromUser?: boolean) => void,
  scheduleAutoAdvance: (delay: number) => void,
  paused: boolean,
  muted: boolean,
  wordTransitionRef: React.MutableRefObject<boolean>,
  setPlayInProgress: (inProgress: boolean) => void
) => {
  const handleSpeechError = useCallback((
    sessionId: string,
    event: SpeechSynthesisErrorEvent,
    currentWord: { word: string },
    speakingRef: React.MutableRefObject<boolean>,
    setIsSpeaking: (isSpeaking: boolean) => void
  ) => {
    speakingRef.current = false;
    setIsSpeaking(false);
    setPlayInProgress(false);
    
    // Silent error handling with auto-advance
    if (!paused && !muted) {
      scheduleAutoAdvance(1500);
    }
    
    // Retry logic for recoverable errors
    const recoverableErrors: SpeechSynthesisErrorCode[] = ['network', 'audio-busy', 'synthesis-failed'];
    if (recoverableErrors.includes(event.error)) {
      if (incrementRetryAttempts()) {
        setTimeout(() => {
          if (!paused && !muted && !wordTransitionRef.current) {
            setPlayInProgress(false);
          }
        }, 1000);
      } else {
        if (!paused && !muted) {
          scheduleAutoAdvance(1500);
        }
      }
    }
  }, [
    incrementRetryAttempts,
    goToNextWord,
    paused,
    muted,
    wordTransitionRef,
    setPlayInProgress,
    scheduleAutoAdvance
  ]);

  return {
    handleSpeechError
  };
};
