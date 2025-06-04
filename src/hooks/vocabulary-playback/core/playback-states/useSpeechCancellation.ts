
import { useCallback, useRef } from 'react';

/**
 * Hook for handling speech cancellation
 */
export const useSpeechCancellation = (
  speakingRef: React.MutableRefObject<boolean>,
  setIsSpeaking: (isSpeaking: boolean) => void
) => {
  // Track when we last canceled to avoid excessive cancellation
  const lastCancelTimeRef = useRef<number>(0);
  
  // Function to cancel any current speech and reset state
  const cancelSpeech = useCallback(() => {
    const now = Date.now();
    
    // Don't cancel too frequently to avoid creating loops
    if (now - lastCancelTimeRef.current < 300) {
      console.log('Cancellation throttled to prevent loops');
      return;
    }
    
    lastCancelTimeRef.current = now;
    
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      console.log('Cancelling ongoing speech');
      window.speechSynthesis.cancel();
      
      // Wait a moment for cancellation to take effect
      setTimeout(() => {
        speakingRef.current = false;
        setIsSpeaking(false);
      }, 100);
    } else {
      // No speech to cancel, just reset state
      speakingRef.current = false;
      setIsSpeaking(false);
    }
  }, [speakingRef, setIsSpeaking]);

  return { cancelSpeech };
};
