import { useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { stopSpeaking } from '@/utils/speech';
import { useTimeoutManager } from './speech/useTimeoutManager';
import { useWordStateManager } from './speech/useWordStateManager';
import { useSpeechSync } from './speech/useSpeechSync';
import { useSpeakCurrentWord } from './speech/useSpeakCurrentWord';
import { useWordChangeEffect } from './speech/useWordChangeEffect';

export const useWordSpeechSync = (
  currentWord,
  isPaused,
  isMuted,
  isVoicesLoaded,
  speakText,
  isSpeakingRef,
  isChangingWordRef
) => {
  const {
    speechTimeoutRef,
    autoRetryTimeoutRef,
    keepAliveIntervalRef,
    initialSpeakTimeoutRef,
    wordProcessingTimeoutRef,
    clearAllTimeouts
  } = useTimeoutManager();

  const {
    lastWordIdRef,
    wordFullySpoken,
    setWordFullySpoken,
    speakAttemptCountRef,
    currentWordRef,
    speechLockRef,
    wordChangeInProgressRef
  } = useWordStateManager(currentWord);

  const { speakCurrentWord } = useSpeakCurrentWord({
    isPaused,
    isMuted,
    isVoicesLoaded,
    speakText,
    isSpeakingRef,
    isChangingWordRef,
    clearAllTimeouts,
    setWordFullySpoken,
    wordChangeInProgressRef,
    currentWordRef,
    lastWordIdRef,
    wordFullySpoken,
    speakAttemptCountRef,
    speechLockRef,
    autoRetryTimeoutRef
  });

  const { resetSpeechSystem } = useSpeechSync(
    currentWord,
    isPaused,
    isMuted,
    isVoicesLoaded,
    isSpeakingRef,
    isChangingWordRef,
    keepAliveIntervalRef,
    clearAllTimeouts,
    speakCurrentWord,
    setWordFullySpoken,
    lastWordIdRef
  );

  useWordChangeEffect({
    currentWord,
    isChangingWordRef,
    wordChangeInProgressRef,
    currentWordRef,
    setWordFullySpoken,
    lastWordIdRef,
    clearAllTimeouts,
    isPaused,
    isMuted,
    initialSpeakTimeoutRef,
    wordProcessingTimeoutRef,
    speakCurrentWord,
  });

  return {
    speakCurrentWord,
    resetLastSpokenWord: resetSpeechSystem,
    wordFullySpoken
  };
};
