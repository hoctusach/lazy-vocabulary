
import { useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Hook for handling speech synthesis errors
 */
export const useSpeechErrorHandling = (
  wordTransitionRef: React.MutableRefObject<boolean>,
  speakingRef: React.MutableRefObject<boolean>,
  setIsSpeaking: (isSpeaking: boolean) => void,
  setHasSpeechPermission: (hasPermission: boolean) => void,
  permissionErrorShownRef: React.MutableRefObject<boolean>,
  goToNextWord: () => void,
  muted: boolean,
  paused: boolean,
  incrementRetryAttempts: () => boolean
) => {
  // Handle speech synthesis errors
  const handleSpeechError = useCallback((event: SpeechSynthesisErrorEvent) => {
    console.error(`Speech synthesis error:`, event);
    
    // Check if we're already in a word transition - if so, don't retry
    if (wordTransitionRef.current) {
      console.log('Error occurred during word transition, not retrying');
      speakingRef.current = false;
      setIsSpeaking(false);
      return;
    }
    
    speakingRef.current = false;
    setIsSpeaking(false);
    
    // Handle permission errors specially
    if (event.error === 'not-allowed') {
      setHasSpeechPermission(false);
      if (!permissionErrorShownRef.current) {
        toast.error("Please click anywhere on the page to enable audio playback");
        permissionErrorShownRef.current = true;
      }
      // Continue to next word even without audio
      setTimeout(() => goToNextWord(), 2000);
      return;
    }
    
    // If error is "canceled" but it was intentional (during muting/pausing), don't retry
    if (event.error === 'canceled' && (muted || paused)) {
      console.log('Speech canceled due to muting or pausing, not retrying');
      // Still auto-advance after a short delay
      setTimeout(() => goToNextWord(), 2000);
      return;
    }
    
    // Handle retry logic
    if (incrementRetryAttempts()) {
      console.log(`Retry attempt in progress`);
      
      // Wait briefly then retry
      setTimeout(() => {
        if (!paused && !wordTransitionRef.current) {
          console.log('Retrying speech after error');
          // This will need to call back to the parent component's playCurrentWord
          // We'll handle this via a callback passed from the parent
        }
      }, 500);
    } else {
      console.log(`Max retries reached, advancing to next word`);
      // Move on after too many failures
      setTimeout(() => goToNextWord(), 1000);
    }
  }, [
    wordTransitionRef, 
    speakingRef, 
    setIsSpeaking, 
    setHasSpeechPermission, 
    permissionErrorShownRef,
    goToNextWord, 
    muted, 
    paused, 
    incrementRetryAttempts
  ]);

  // Handle silent failures when speech synthesis doesn't trigger error but doesn't speak
  const handleSilentFailure = useCallback(() => {
    console.warn("Speech synthesis not speaking after 200ms - potential silent failure");
    
    if (!window.speechSynthesis.speaking && !paused && !muted && !wordTransitionRef.current) {
      // If we haven't exceeded retry attempts, try again
      if (incrementRetryAttempts()) {
        console.log(`Silent failure detected, retrying`);
        // This will need to call back to the parent component's playCurrentWord
        // We'll handle this via a callback passed from the parent
      } else {
        // If we've tried enough times, move on
        console.log("Moving to next word after silent failures");
        goToNextWord();
      }
    }
  }, [goToNextWord, muted, paused, wordTransitionRef, incrementRetryAttempts]);

  return {
    handleSpeechError,
    handleSilentFailure
  };
};
