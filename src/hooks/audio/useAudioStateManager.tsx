
import { useRef, useCallback } from 'react';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

export const useAudioStateManager = () => {
  // Audio playback state and refs
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const lastSpokenWordRef = useRef<string | null>(null);
  const wordChangeProcessingRef = useRef(false);
  const speechAttemptsRef = useRef(0);
  
  // Clear the auto-advance timer
  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      unifiedSpeechController.unregisterTimer(autoAdvanceTimerRef.current);
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
      console.log('[APP] Auto-advance timer cleared');
    }
  }, []);

  // Reset tracking of last spoken word
  const resetLastSpokenWord = useCallback(() => {
    lastSpokenWordRef.current = null;
    console.log('[APP] Last spoken word reference cleared');
  }, []);

  return {
    autoAdvanceTimerRef,
    lastSpokenWordRef,
    wordChangeProcessingRef,
    speechAttemptsRef,
    clearAutoAdvanceTimer,
    resetLastSpokenWord
  };
};
