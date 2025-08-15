
import * as React from 'react';
import { useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

export const usePauseEffect = (
  isPaused: boolean,
  mute: boolean,
  currentWord: VocabularyWord | null,
  stopSpeaking: () => void,
  clearAutoAdvanceTimer: () => void,
  setIsSoundPlaying: (playing: boolean) => void,
  pauseRequestedRef: React.MutableRefObject<boolean> | undefined,
  wordChangeProcessingRef: React.MutableRefObject<boolean>,
  lastSpokenWordRef: React.MutableRefObject<string | null>
) => {
  // Effect to handle pause/unpause behavior
  useEffect(() => {
    if (isPaused) {
      console.log('[APP] Paused, stopping ongoing speech');
      stopSpeaking();
      clearAutoAdvanceTimer();
      setIsSoundPlaying(false);
      
      if (pauseRequestedRef) {
        pauseRequestedRef.current = true;
      }
    } else if (currentWord && !mute && lastSpokenWordRef.current !== currentWord.word) {
      // When unpausing, if we have a current word and it hasn't been spoken, speak it
      console.log('[APP] Unpaused with new word, will speak:', currentWord.word);
      
      if (pauseRequestedRef) {
        pauseRequestedRef.current = false;
      }
      
      // Reset speech state
      wordChangeProcessingRef.current = false;
      lastSpokenWordRef.current = null; // Force re-speak by clearing last spoken word
      
      // Small delay to ensure clean state
      setTimeout(() => {
        // Force a re-render to trigger the speech effect
        setIsSoundPlaying(false);
        setTimeout(() => {
          if (!isPaused && !mute) {
            setIsSoundPlaying(true);
          }
        }, 50);
      }, 200);
    }
  }, [isPaused, mute, currentWord, stopSpeaking, clearAutoAdvanceTimer, setIsSoundPlaying, pauseRequestedRef, wordChangeProcessingRef, lastSpokenWordRef]);
};
