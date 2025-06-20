
import { useEffect, useCallback } from 'react';

export const useAudioCleanup = (
  clearAutoAdvanceTimer: () => void,
  stopSpeaking: () => void,
  setIsSoundPlaying: (playing: boolean) => void
) => {
  // Clear function to ensure we always clean up properly
  const clearAllAudioState = useCallback(() => {
    clearAutoAdvanceTimer();
    stopSpeaking();
    setIsSoundPlaying(false);
  }, [clearAutoAdvanceTimer, stopSpeaking, setIsSoundPlaying]);

  // Set up document-level interaction handler for speech permissions
  useEffect(() => {
    const documentClickHandler = () => {
      // This empty handler helps enable speech in browsers that require user gesture
      if (window.speechSynthesis && !speechSynthesis.speaking) {
        try {
          // Just create a silent utterance to "unlock" speech
          const silentUtterance = new SpeechSynthesisUtterance('');
          silentUtterance.volume = 0;
          window.speechSynthesis.speak(silentUtterance);
        } catch (error) {
          // Ignore errors here, just trying to enable speech
        }
      }
    };

    // Add the event listener to the document
    document.addEventListener('click', documentClickHandler);
    
    // Clean up
    return () => {
      document.removeEventListener('click', documentClickHandler);
      clearAllAudioState();
    };
  }, [clearAllAudioState]);

  return { clearAllAudioState };
};
