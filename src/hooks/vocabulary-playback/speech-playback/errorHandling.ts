
// Speech error handling utilities
export const handleSpeechError = (
  error: any, 
  retryAttemptsRef: React.MutableRefObject<number>,
  maxRetryAttempts: number,
  setIsSpeaking: (isSpeaking: boolean) => void,
  advanceToNext: () => void,
  muted: boolean,
  paused: boolean
): boolean => {
  console.error(`Speech synthesis error:`, error);
  setIsSpeaking(false);
  
  // Increment retry counter
  retryAttemptsRef.current++;
  
  // If we've exceeded retry attempts, return true to indicate we should move on
  if (retryAttemptsRef.current > maxRetryAttempts) {
    console.log(`Max retries (${maxRetryAttempts}) reached, advancing to next word`);
    if (!paused && !muted) {
      advanceToNext();
    }
    return true;
  }
  
  return false; // Return false to indicate we should retry
};

// Handle not-allowed error specifically
export const handleNotAllowedError = (
  event: SpeechSynthesisErrorEvent, 
  retryAttemptsRef: React.MutableRefObject<number>,
  maxRetryAttempts: number,
  utterance: SpeechSynthesisUtterance,
  setIsSpeaking: (isSpeaking: boolean) => void,
  advanceToNext: () => void,
  muted: boolean,
  paused: boolean
): void => {
  console.log('Detected not-allowed error, attempting to retry...');
  
  // Try to resume speech
  window.speechSynthesis.resume();
  
  // Increment retry counter
  retryAttemptsRef.current++;
  
  if (retryAttemptsRef.current <= maxRetryAttempts) {
    // Wait and retry
    setTimeout(() => {
      if (muted || paused) {
        console.log("Skipping retry due to mute/pause state change");
        return;
      }
      
      try {
        console.log(`Retry attempt ${retryAttemptsRef.current}/${maxRetryAttempts}`);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      } catch (err) {
        console.error("Speech retry failed:", err);
        setIsSpeaking(false);
        // If retry fails, advance to next word
        if (!paused && !muted) {
          console.log("Advancing to next word after failed retry");
          advanceToNext();
        }
      }
    }, 500);
  } else {
    // Max retries reached, move to next word
    console.log(`Max retries (${maxRetryAttempts}) reached, advancing to next word`);
    if (!paused && !muted) {
      advanceToNext();
    }
  }
};

// Handle silent failure (when speech synthesis doesn't trigger error but also doesn't speak)
export const handleSilentFailure = (
  retryAttemptsRef: React.MutableRefObject<number>,
  maxRetryAttempts: number,
  utterance: SpeechSynthesisUtterance,
  speakingFailedRef: React.MutableRefObject<boolean>,
  setIsSpeaking: (isSpeaking: boolean) => void,
  advanceToNext: () => void,
  muted: boolean,
  paused: boolean
): void => {
  console.warn("Speech synthesis not speaking after 200ms - potential silent failure");
  setIsSpeaking(false);
  
  // If not speaking and we haven't seen an error, try again once
  if (retryAttemptsRef.current === 0) {
    console.log("Silent failure detected, retrying once");
    retryAttemptsRef.current++;
    try {
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    } catch (e) {
      console.error("Silent failure retry failed:", e);
      setIsSpeaking(false);
      // If retry fails, advance to next word
      if (!paused && !muted) {
        advanceToNext();
      }
    }
  } else if (!paused && !muted) {
    // If we already retried, just move on
    console.log("Silent failure persists, advancing to next word");
    advanceToNext();
  }
};
