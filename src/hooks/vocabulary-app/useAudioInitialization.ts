
import { useEffect } from 'react';
import { toast } from 'sonner';

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
        
        // If voices are loaded, mark that we had user interaction via localStorage
        // This helps with resuming playback after page reloads
        if (voices.length > 0) {
          try {
            localStorage.setItem('hadUserInteraction', 'true');
          } catch (e) {
            console.error('Error saving user interaction state:', e);
          }
        }
      };
      
      // Try to load immediately and also listen for the voiceschanged event
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      
      // Try to create an immediate, silent utterance to activate speech synthesis
      try {
        const silentUtterance = new SpeechSynthesisUtterance(' ');
        silentUtterance.volume = 0.01; // Nearly silent
        window.speechSynthesis.speak(silentUtterance);
      } catch (e) {
        console.error('Failed to initialize silent utterance:', e);
      }
      
      // Clean up
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        window.speechSynthesis.cancel();
      };
    }
  }, []);
};
