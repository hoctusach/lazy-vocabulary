
import { VoiceSelection } from '../useVoiceSelection';

// Function to ensure voices are loaded before speaking
export const ensureVoicesLoaded = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    console.log("Ensuring voices are loaded...");
    const voices = window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      console.log(`Voices already loaded: ${voices.length} voices available`);
      resolve(voices);
      return;
    }

    // If no voices available, wait for the voiceschanged event
    console.log("No voices available yet, waiting for voiceschanged event...");
    const voicesChangedHandler = () => {
      const newVoices = window.speechSynthesis.getVoices();
      console.log(`Voices loaded via event: ${newVoices.length} voices available`);
      window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
      resolve(newVoices);
    };

    window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);

    // Fallback timeout in case the event never fires
    setTimeout(() => {
      const availableVoices = window.speechSynthesis.getVoices();
      console.log(`Fallback voices: ${availableVoices.length} voices available`);
      window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
      resolve(availableVoices);
    }, 2000);
  });
};
