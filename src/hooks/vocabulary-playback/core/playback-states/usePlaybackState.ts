
import { useState, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Hook for managing the core playback state
 */
export const usePlaybackState = () => {
  // Basic state for current word index
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Get core playback functionality
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingRef = useRef(false);
  const retryAttemptsRef = useRef(0);
  const userInteractionRef = useRef(false);
  const voicesLoadedRef = useRef(false);
  
  // Max retries for speech synthesis attempts
  const maxRetryAttempts = 3;
  
  // Function to reset retry attempts counter
  const resetRetryAttempts = () => {
    retryAttemptsRef.current = 0;
  };

  // Function to increment retry attempts and check if max is reached
  const incrementRetryAttempts = (): boolean => {
    retryAttemptsRef.current += 1;
    return retryAttemptsRef.current <= maxRetryAttempts;
  };
  
  // Function to check browser speech support
  const checkSpeechSupport = (): boolean => {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported in this browser');
      toast.error("Speech synthesis isn't supported in your browser");
      return false;
    }
    return true;
  };

  return {
    currentIndex,
    setCurrentIndex,
    isSpeaking,
    setIsSpeaking,
    speakingRef,
    retryAttemptsRef,
    userInteractionRef,
    voicesLoadedRef,
    resetRetryAttempts,
    incrementRetryAttempts,
    checkSpeechSupport
  };
};
