
// Simple utility to handle speech synthesis tasks

export const speak = (text: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported in this browser');
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    console.log(`Available voices: ${voices.length}`);
    
    // Function to set voice
    const setVoiceAndSpeak = (region: 'US' | 'UK' = 'US') => {
      try {
        // Try to find a voice based on region
        const langCode = region === 'US' ? 'en-US' : 'en-GB';
        let voice = voices.find(v => v.lang === langCode);
        
        // Fallback to any English voice
        if (!voice) {
          voice = voices.find(v => v.lang.startsWith('en'));
        }
        
        // Last resort - use any voice
        if (!voice && voices.length > 0) {
          voice = voices[0];
        }
        
        if (voice) {
          console.log(`Using voice: ${voice.name} (${voice.lang})`);
          utterance.voice = voice;
        } else {
          console.warn('No suitable voice found, using default browser voice');
        }
        
        // Configure speech parameters - slower rate for better comprehension
        utterance.rate = 0.9; // Slightly slower rate
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Set event handlers
        utterance.onend = () => {
          console.log('Speech completed successfully');
          resolve();
        };
        
        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event);
          reject(new Error(`Speech error: ${event.error}`));
        };
        
        // Start speaking
        console.log('Starting speech:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
        
        // Chrome bug workaround - ensure speech synthesis is not paused
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        
        window.speechSynthesis.speak(utterance);
        
        // Chrome workaround - sometimes speech gets cut off
        // This keeps the speech synthesis object active
        const keepAlive = () => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
            setTimeout(keepAlive, 5000);
          }
        };
        setTimeout(keepAlive, 5000);
      } catch (err) {
        console.error('Error while setting up speech:', err);
        reject(err);
      }
    };
    
    // Execute immediately if voices are available, otherwise wait
    if (voices.length > 0) {
      setVoiceAndSpeak();
    } else {
      // For Chrome which loads voices asynchronously
      window.speechSynthesis.onvoiceschanged = () => {
        const updatedVoices = window.speechSynthesis.getVoices();
        console.log(`Voices loaded asynchronously: ${updatedVoices.length}`);
        setVoiceAndSpeak();
        // Remove the handler to avoid multiple calls
        window.speechSynthesis.onvoiceschanged = null;
      };
      
      // Fallback if onvoiceschanged doesn't fire
      setTimeout(() => {
        if (!utterance.voice) {
          const fallbackVoices = window.speechSynthesis.getVoices();
          if (fallbackVoices.length > 0) {
            console.log('Using fallback voice loading method');
            setVoiceAndSpeak();
          } else {
            reject(new Error('Could not load voices'));
          }
        }
      }, 1000);
    }
  });
};

export const stopSpeaking = (): void => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    console.log('Speech stopped');
  }
};

// Function to check if speech synthesis is available
export const isSpeechSynthesisSupported = (): boolean => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

// Find a fallback voice function - maintained for compatibility with useVoiceManager
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
