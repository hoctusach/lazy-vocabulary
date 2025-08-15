
import { useState, useCallback, useRef } from 'react';

export const useSpeechError = () => {
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [hasSpeechPermission, setHasSpeechPermission] = useState(true);
  const retryAttemptsRef = useRef(0);
  const maxRetryAttempts = 3;

  // Function to reset speech state after errors
  const resetSpeechState = useCallback(() => {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    console.log('Speech state reset after error');
  }, []);

  // Function to handle speech permissions
  const handleSpeechPermissionError = useCallback(() => {
    setHasSpeechPermission(false);
    setSpeechError('Speech requires user interaction. Please click anywhere or press Play.');
    resetSpeechState();
  }, [resetSpeechState]);
  
  // Function to retry speech initialization
  const retrySpeechInitialization = useCallback(() => {
    setHasSpeechPermission(true);
    setSpeechError(null);
    retryAttemptsRef.current = 0;
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Function to handle speech errors
  const handleSpeechError = useCallback((error: any) => {
    console.error("Error in speech synthesis:", error);
    
    // Increment retry attempts
    retryAttemptsRef.current++;
    
    if (error.message?.includes('not-allowed')) {
      handleSpeechPermissionError();
      return true;
    } else if (retryAttemptsRef.current >= maxRetryAttempts) {
      setSpeechError('Audio playback is unavailable. You can still practice silently.');
      return true;
    } else {
      setSpeechError(`Speech error (attempt ${retryAttemptsRef.current}/${maxRetryAttempts})`);
      return false;
    }
  }, [handleSpeechPermissionError, maxRetryAttempts]);

  return {
    speechError,
    setSpeechError,
    hasSpeechPermission,
    setHasSpeechPermission,
    retryAttemptsRef,
    maxRetryAttempts,
    resetSpeechState,
    handleSpeechPermissionError,
    retrySpeechInitialization,
    handleSpeechError
  };
};
