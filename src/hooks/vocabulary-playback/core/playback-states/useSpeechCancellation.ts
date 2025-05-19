
import { useCallback } from 'react';

/**
 * Hook for handling speech cancellation
 */
export const useSpeechCancellation = (
  speakingRef: React.MutableRefObject<boolean>,
  setIsSpeaking: (isSpeaking: boolean) => void
) => {
  // Function to cancel any current speech and reset state
  const cancelSpeech = useCallback(() => {
    if (window.speechSynthesis) {
      console.log('Cancelling any ongoing speech');
      window.speechSynthesis.cancel();
      speakingRef.current = false;
      setIsSpeaking(false);
    }
  }, [speakingRef, setIsSpeaking]);

  return { cancelSpeech };
};
