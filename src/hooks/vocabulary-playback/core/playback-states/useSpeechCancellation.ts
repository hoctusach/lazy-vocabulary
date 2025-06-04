
import { useCallback } from 'react';
import { speechController } from '@/utils/speech/core/speechController';

/**
 * Hook for handling speech cancellation using the centralized controller
 */
export const useSpeechCancellation = (
  speakingRef: React.MutableRefObject<boolean>,
  setIsSpeaking: (isSpeaking: boolean) => void
) => {
  // Function to cancel any current speech and reset state
  const cancelSpeech = useCallback(() => {
    console.log('[CANCELLATION] Cancelling speech via controller');
    
    // Use the centralized controller to stop speech
    speechController.stop();
    
    // Update local state
    speakingRef.current = false;
    setIsSpeaking(false);
    
    console.log('[CANCELLATION] Speech cancelled and state reset');
  }, [speakingRef, setIsSpeaking]);

  return { cancelSpeech };
};
