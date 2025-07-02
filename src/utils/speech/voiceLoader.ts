
/**
 * Utility to ensure speech synthesis voices are loaded
 */
import { logAvailableVoices } from './debug/logVoices';

export const ensureVoicesLoaded = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    let voices = window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      console.log('Voices already loaded:', voices.length, 'voices available');
      logAvailableVoices(voices);
      resolve(voices);
      return;
    }

    // Wait for voices to load
    const loadVoices = () => {
      voices = window.speechSynthesis.getVoices();
      console.log('Voices loaded:', voices.length, 'voices available');
      logAvailableVoices(voices);
      resolve(voices);
    };

    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    // Fallback timeout
    setTimeout(() => {
      voices = window.speechSynthesis.getVoices();
      console.log('Voices loaded after timeout:', voices.length, 'voices available');
      logAvailableVoices(voices);
      resolve(voices);
    }, 1000);
  });
};
