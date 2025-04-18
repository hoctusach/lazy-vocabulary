
export const speak = (text: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported');
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    // Cancel any previous speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get available voices
    let voices = window.speechSynthesis.getVoices();
    
    // If voices array is empty, try to get them again after a short delay
    if (voices.length === 0) {
      console.log('No voices available yet, trying again...');
      setTimeout(() => {
        voices = window.speechSynthesis.getVoices();
        continueWithVoices(voices);
      }, 100);
    } else {
      continueWithVoices(voices);
    }
    
    function continueWithVoices(availableVoices: SpeechSynthesisVoice[]) {
      // First try to find a Google US English voice
      let selectedVoice = availableVoices.find(voice => 
        voice.name.includes('Google') && voice.lang === 'en-US'
      );
      
      // If no Google voice, try any US English voice
      if (!selectedVoice) {
        selectedVoice = availableVoices.find(voice => voice.lang === 'en-US');
      }
      
      // If still no voice, try any English voice
      if (!selectedVoice) {
        selectedVoice = availableVoices.find(voice => voice.lang.startsWith('en'));
      }
      
      // Last resort - use the first available voice
      if (!selectedVoice && availableVoices.length > 0) {
        selectedVoice = availableVoices[0];
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('Using voice:', selectedVoice.name);
      } else {
        console.warn('No suitable voice found, using default browser voice');
      }
      
      utterance.rate = 1.0; // Normal speed
      utterance.pitch = 1.0; // Normal pitch
      utterance.volume = 1.0; // Full volume
      
      utterance.onend = () => {
        console.log('Speech completed');
        resolve();
      };
      
      utterance.onerror = (event) => {
        console.error('Speech error:', event);
        reject(event);
      };
      
      // Speak the text
      console.log('Starting speech for:', text);
      window.speechSynthesis.speak(utterance);
    }
  });
};

export const stopSpeaking = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    console.log('Speech stopped');
  }
};

// Find a fallback voice function
export const findFallbackVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  if (!voices || voices.length === 0) {
    return null;
  }
  
  // Try to find any English voice first
  const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
  if (englishVoice) {
    return englishVoice;
  }
  
  // If no English voice is available, return the first available voice
  return voices[0];
};
