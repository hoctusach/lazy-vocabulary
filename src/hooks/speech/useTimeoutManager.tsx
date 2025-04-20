
import { useRef, useCallback } from 'react';

export const useTimeoutManager = () => {
  const speechTimeoutRef = useRef<number | null>(null);
  const autoRetryTimeoutRef = useRef<number | null>(null);
  const keepAliveIntervalRef = useRef<number | null>(null);
  const initialSpeakTimeoutRef = useRef<number | null>(null);
  const wordProcessingTimeoutRef = useRef<number | null>(null);

  const clearAllTimeouts = useCallback(() => {
    if (speechTimeoutRef.current !== null) {
      window.clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    
    if (autoRetryTimeoutRef.current !== null) {
      window.clearTimeout(autoRetryTimeoutRef.current);
      autoRetryTimeoutRef.current = null;
    }
    
    if (keepAliveIntervalRef.current !== null) {
      window.clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
    
    if (initialSpeakTimeoutRef.current !== null) {
      window.clearTimeout(initialSpeakTimeoutRef.current);
      initialSpeakTimeoutRef.current = null;
    }
    
    if (wordProcessingTimeoutRef.current !== null) {
      window.clearTimeout(wordProcessingTimeoutRef.current);
      wordProcessingTimeoutRef.current = null;
    }
  }, []);

  return {
    speechTimeoutRef,
    autoRetryTimeoutRef,
    keepAliveIntervalRef,
    initialSpeakTimeoutRef,
    wordProcessingTimeoutRef,
    clearAllTimeouts
  };
};
