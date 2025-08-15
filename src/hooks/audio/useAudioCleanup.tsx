
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
    if (localStorage.getItem('speechUnlocked') === 'true') {
      return () => {
        clearAllAudioState();
      };
    }

    const documentClickHandler = () => {
      if (window.speechSynthesis && !speechSynthesis.speaking) {
        try {
          const silentUtterance = new SpeechSynthesisUtterance('');
          silentUtterance.volume = 0;
          window.speechSynthesis.speak(silentUtterance);
          localStorage.setItem('speechUnlocked', 'true');
        } catch {
          // Ignore errors
        }
      }
    };

    document.addEventListener('click', documentClickHandler, { once: true });

    return () => {
      document.removeEventListener('click', documentClickHandler);
      clearAllAudioState();
    };
  }, [clearAllAudioState]);

  return { clearAllAudioState };
};
