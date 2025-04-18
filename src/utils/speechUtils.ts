// Simple utility to handle speech synthesis tasks

export const speak = (text: string, region: 'US' | 'UK' = 'US'): Promise<void> => {
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
    let voices = window.speechSynthesis.getVoices();
    console.log(`Available voices: ${voices.length}`);
    
    // Function to set voice
    const setVoiceAndSpeak = () => {
      try {
        // Define language code based on region
        const langCode = region === 'US' ? 'en-US' : 'en-GB';
        
        // Try to find a good voice that matches our criteria
        let voice = null;
        
        // First, try to find Google or Microsoft voices for the selected region
        if (region === 'US') {
          voice = voices.find(v => 
            v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Microsoft'))
          );
        } else {
          voice = voices.find(v => 
            v.lang === 'en-GB' && (v.name.includes('Google') || v.name.includes('Microsoft'))
          );
        }
        
        // If no premium voice found, try any voice for that region
        if (!voice) {
          voice = voices.find(v => v.lang === langCode);
        }
        
        // Fallback to any English voice
        if (!voice) {
          voice = voices.find(v => v.lang.startsWith('en'));
        }
        
        // Last resort - use any voice
        if (!voice && voices.length > 0) {
          voice = voices[0];
        }
        
        if (voice) {
          console.log(`Using voice: ${voice.name} (${voice.lang}) for region ${region}`);
          utterance.voice = voice;
          utterance.lang = langCode; // Explicitly set language code
        } else {
          console.warn('No suitable voice found, using default browser voice');
        }
        
        // Configure speech parameters for better comprehension
        utterance.rate = 0.8; // Slightly slower for better understanding
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Set event handlers
        utterance.onend = () => {
          console.log('Speech completed successfully');
          clearKeepAliveInterval();
          resolve();
        };
        
        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event);
          clearKeepAliveInterval();
          // Don't reject on cancel error as it's often just due to user navigation
          if (event.error === 'canceled' || event.error === 'interrupted') {
            console.log('Speech was canceled or interrupted, resolving anyway');
            resolve();
          } else {
            reject(new Error(`Speech error: ${event.error}`));
          }
        };
        
        // Start speaking
        console.log('Starting speech:', text.substring(0, 30) + '...');
        
        // Make sure speech synthesis is not paused
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        
        window.speechSynthesis.speak(utterance);
        
        // Keep alive interval reference
        let keepAliveInterval: number | null = null;
        
        // Function to clear the keep alive interval
        const clearKeepAliveInterval = () => {
          if (keepAliveInterval !== null) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
          }
        };
        
        // This keeps the speech synthesis active in Chrome by using setInterval instead of setTimeout
        keepAliveInterval = window.setInterval(() => {
          if (window.speechSynthesis.speaking) {
            console.log("Keeping speech synthesis alive...");
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          } else {
            clearKeepAliveInterval();
          }
        }, 5000); // Run every 5 seconds to prevent Chrome from cutting off
        
        // Set a maximum speech duration timeout as a fallback (30 seconds)
        setTimeout(() => {
          if (window.speechSynthesis.speaking) {
            console.log("Maximum speech duration reached, stopping speech");
            window.speechSynthesis.cancel();
            clearKeepAliveInterval();
            resolve(); // Resolve the promise even if we had to stop it early
          }
        }, 30000);
      } catch (err) {
        console.error('Error while setting up speech:', err);
        reject(err);
      }
    };
    
    if (voices.length > 0) {
      setVoiceAndSpeak();
    } else {
      // For browsers that load voices asynchronously
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        console.log(`Voices loaded asynchronously: ${voices.length}`);
        setVoiceAndSpeak();
        window.speechSynthesis.onvoiceschanged = null;
      };
      
      // Fallback in case onvoiceschanged doesn't fire
      setTimeout(() => {
        if (!utterance.voice) {
          voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
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
  
  // Add a larger buffer for pauses and natural speech patterns (100% buffer)
  // This helps prevent cutting off longer texts
  return milliseconds * 2;
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

// Get voice by region function 
export const getVoiceByRegion = (region: 'US' | 'UK'): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis.getVoices();
  
  if (!voices || voices.length === 0) {
    return null;
  }
  
  // Define language code
  const langCode = region === 'US' ? 'en-US' : 'en-GB';
  
  // First try to find a premium voice (Google or Microsoft)
  let voice = voices.find(v => 
    v.lang === langCode && (v.name.includes('Google') || v.name.includes('Microsoft'))
  );
  
  // If no premium voice found, try any voice for that region
  if (!voice) {
    voice = voices.find(v => v.lang === langCode);
  }
  
  // Fallback to any English voice if not found
  if (!voice) {
    voice = voices.find(v => v.lang.startsWith('en'));
  }
  
  // Last resort - use any voice
  if (!voice && voices.length > 0) {
    voice = voices[0];
  }
  
  console.log(`Selected voice for ${region}:`, voice ? `${voice.name} (${voice.lang})` : "None found");
  return voice;
};
