
import { useState, useEffect, useRef, useCallback } from 'react';
import { stopSpeaking, speak } from '@/utils/speech';
import { VocabularyWord } from '@/types/vocabulary';

export const useVocabularyAudioSync = (
  currentWord: VocabularyWord | null, 
  isPaused: boolean, 
  isMuted: boolean, 
  voiceRegion: 'US' | 'UK' | 'AU'
) => {
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const lastSpokenWordRef = useRef<string | null>(null);
  const wordChangeProcessingRef = useRef(false);
  const speechAttemptsRef = useRef(0);
  const [displayTime, setDisplayTime] = useState(10000);

  // Clear the auto-advance timer
  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
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
    isSoundPlaying,
    setIsSoundPlaying,
    autoAdvanceTimerRef,
    displayTime,
    setDisplayTime,
    lastSpokenWordRef,
    wordChangeProcessingRef,
    speechAttemptsRef,
    clearAutoAdvanceTimer,
    resetLastSpokenWord
  };
};
