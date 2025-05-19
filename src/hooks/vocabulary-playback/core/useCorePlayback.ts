
import { useState, useRef } from 'react';
import { toast } from "sonner";

/**
 * Core playback state and utility functions
 */
export const useCorePlayback = () => {
  // Basic state for playback
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingRef = useRef(false);
  const retryAttemptsRef = useRef(0);
  const maxRetries = 3;
  const userInteractionRef = useRef(false);

  // Function to check browser speech support
  const checkSpeechSupport = (): boolean => {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported in this browser');
      toast.error("Speech synthesis isn't supported in your browser");
      return false;
    }
    return true;
  };
  
  // Reset retry attempts counter
  const resetRetryAttempts = () => {
    retryAttemptsRef.current = 0;
  };

  // Increment retry counter
  const incrementRetryAttempts = (): boolean => {
    retryAttemptsRef.current++;
    return retryAttemptsRef.current <= maxRetries;
  };
  
  return {
    isSpeaking,
    setIsSpeaking,
    speakingRef,
    retryAttemptsRef,
    maxRetries,
    userInteractionRef,
    checkSpeechSupport,
    resetRetryAttempts,
    incrementRetryAttempts
  };
};
