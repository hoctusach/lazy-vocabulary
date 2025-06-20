
/**
 * Utility to ensure speech synthesis voices are loaded
 */
export const ensureVoicesLoaded = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    let voices = window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      console.log('Voices already loaded:', voices.length, 'voices available');
      resolve(voices);
      return;
    }

    // Wait for voices to load
    const loadVoices = () => {
      voices = window.speechSynthesis.getVoices();
      console.log('Voices loaded:', voices.length, 'voices available');
      resolve(voices);
    };

    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    // Fallback timeout
    setTimeout(() => {
      voices = window.speechSynthesis.getVoices();
      console.log('Voices loaded after timeout:', voices.length, 'voices available');
      resolve(voices);
    }, 1000);
  });
};

export const logAvailableVoices = () => {
  const voices = window.speechSynthesis.getVoices();
  console.log('Available voices:', voices.map(v => ({
    name: v.name,
    lang: v.lang,
    default: v.default
  })));
};
