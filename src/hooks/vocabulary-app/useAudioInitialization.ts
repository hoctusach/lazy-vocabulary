
import * as React from 'react';
import { useEffect } from 'react';
import { logAvailableVoices } from '@/utils/speech/debug/logVoices';

interface AudioInitializationProps {
  userInteractionRef: React.MutableRefObject<boolean>;
  playCurrentWord: () => void;
  playbackCurrentWord: any;
}

export const useAudioInitialization = ({
  userInteractionRef,
  playCurrentWord,
  playbackCurrentWord
}: AudioInitializationProps) => {
  // Auto-initialize speech synthesis as early as possible
  useEffect(() => {
    // Initialize speech synthesis immediately - no waiting for user interaction
    if (window.speechSynthesis) {
      // Try to force voices to load early
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log(`Initial voices loaded: ${voices.length} voices available`);
        logAvailableVoices(voices);
      };
      
      // Try to load immediately and also listen for the voiceschanged event
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      
      // Clean up
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
      };
    }
  }, []);
};
