
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
    const audioRef = { current: null as AudioContext | null };
    const documentClickHandler = () => {
      try {
        window.speechSynthesis.getVoices();
        const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtor) {
          if (!audioRef.current) {
            audioRef.current = new AudioCtor();
          }
          if (audioRef.current.state === 'suspended') {
            audioRef.current.resume().catch(() => {});
          }
        }
      } catch {
        // ignore
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
