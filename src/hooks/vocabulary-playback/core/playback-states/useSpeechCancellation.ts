import * as React from 'react';
import { useCallback } from 'react';
import { stopSpeaking } from '@/utils/speech';

/**
 * Hook for handling speech cancellation using the centralized controller
 */
export const useSpeechCancellation = (
  speakingRef: React.MutableRefObject<boolean>,
  setIsSpeaking: (isSpeaking: boolean) => void,
  resetPlayInProgress: () => void
) => {
  // Function to cancel any current speech and reset state
  const cancelSpeech = useCallback(() => {
    console.log('[CANCELLATION] Cancelling speech via controller');

    // Use the centralized controller to stop speech
    stopSpeaking();

    // Reset the playback in progress flag
    resetPlayInProgress();
    
    // Update local state
    speakingRef.current = false;
    setIsSpeaking(false);
    
    console.log('[CANCELLATION] Speech cancelled and state reset');
  }, [speakingRef, setIsSpeaking, resetPlayInProgress]);

  return { cancelSpeech };
};
