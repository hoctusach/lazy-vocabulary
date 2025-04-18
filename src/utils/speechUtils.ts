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
        
        // Configure speech parameters for better comprehension
        utterance.rate = 0.85;
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
        console.log('Starting speech');
        
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        
        window.speechSynthesis.speak(utterance);
        
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
    
    if (voices.length > 0) {
      setVoiceAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        const updatedVoices = window.speechSynthesis.getVoices();
        console.log(`Voices loaded asynchronously: ${updatedVoices.length}`);
        setVoiceAndSpeak();
        window.speechSynthesis.onvoiceschanged = null;
      };
      
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

// Calculate estimated speech duration in milliseconds
export const calculateSpeechDuration = (text: string, rate: number = 0.85): number => {
  // Average speaking rate is about 150 words per minute at normal speed (1.0)
  // We'll estimate 150 * rate words per minute
  const wordsPerMinute = 150 * rate;
  const words = text.split(' ').length;
  const minutes = words / wordsPerMinute;
  const milliseconds = minutes * 60 * 1000;
  
  // Add a buffer for pauses and natural speech patterns (20% buffer)
  return milliseconds * 1.2;
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
