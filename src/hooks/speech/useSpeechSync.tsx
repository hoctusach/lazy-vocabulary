
import * as React from 'react';
import { useEffect, useCallback } from 'react';
import { stopSpeaking, keepSpeechAlive } from '@/utils/speech';
import { VocabularyWord } from '@/types/vocabulary';

export const useSpeechSync = (
  currentWord: VocabularyWord | null,
  isPaused: boolean,
  isMuted: boolean,
  isVoicesLoaded: boolean,
  isSpeakingRef: React.MutableRefObject<boolean>,
  isChangingWordRef: React.MutableRefObject<boolean>,
  keepAliveIntervalRef: React.MutableRefObject<number | null>,
  clearAllTimeouts: () => void,
  speakCurrentWord: (forceSpeak: boolean) => void,
  setWordFullySpoken: (value: boolean) => void,
  lastWordIdRef: React.MutableRefObject<string | null>,
) => {
  const resetSpeechSystem = useCallback(() => {
    stopSpeaking();
    clearAllTimeouts();
    lastWordIdRef.current = null;
    isSpeakingRef.current = false;
    setWordFullySpoken(false);
  }, [clearAllTimeouts, isSpeakingRef, lastWordIdRef, setWordFullySpoken]);

  // Handle speech keep-alive
  useEffect(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
    }
    
    keepAliveIntervalRef.current = window.setInterval(() => {
      if (isSpeakingRef.current && !isPaused && !isMuted) {
        keepSpeechAlive();
      }
    }, 10);
    
    return () => {
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
    };
  }, [isSpeakingRef, isPaused, isMuted, keepAliveIntervalRef]);

  return {
    resetSpeechSystem
  };
};
