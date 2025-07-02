
import { logAvailableVoices } from '@/utils/speech/debug/logVoices';

// Maximum number of attempts to load voices
const MAX_VOICE_LOAD_ATTEMPTS = 10;

// Function to load voices with retries
export const ensureVoicesLoaded = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise(async (resolve) => {
    console.log('Ensuring voices are loaded...');
    
    // Helper function to check if voices are available
    const checkVoices = (): SpeechSynthesisVoice[] => {
      if (window.speechSynthesis) {
        const availableVoices = window.speechSynthesis.getVoices();
        logAvailableVoices(availableVoices);
        return availableVoices;
      }
      return [];
    };
    
    // Try to get voices immediately
    let voices = checkVoices();
    if (voices.length > 0) {
      console.log(`Voices already loaded: ${voices.length} voices available`);
      logAvailableVoices(voices);
      resolve(voices);
      return;
    }
    
    // Set up event listener for voices changed event
    const voicesChangedHandler = () => {
      voices = checkVoices();
      console.log(`Voices loaded via event: ${voices.length} voices available`);
      logAvailableVoices(voices);
      window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
      resolve(voices);
    };
    
    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
    }
    
    // Fallback: try loading voices with increasing delays
    let attempts = 0;
    const tryLoadingVoices = () => {
      voices = checkVoices();
      
      if (voices.length > 0) {
        console.log(`Voices loaded after ${attempts + 1} attempts: ${voices.length} voices`);
        logAvailableVoices(voices);
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        resolve(voices);
        return;
      }
      
      attempts++;
      if (attempts < MAX_VOICE_LOAD_ATTEMPTS) {
        console.log(`No voices yet, attempt ${attempts}/${MAX_VOICE_LOAD_ATTEMPTS}`);
        setTimeout(tryLoadingVoices, 300 * attempts); // Increasing delay
      } else {
        console.log(`Failed to load voices after ${MAX_VOICE_LOAD_ATTEMPTS} attempts`);
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        resolve([]); // Resolve with empty array after max attempts
      }
    };
    
    // Start trying to load voices
    setTimeout(tryLoadingVoices, 100);
  });
};
