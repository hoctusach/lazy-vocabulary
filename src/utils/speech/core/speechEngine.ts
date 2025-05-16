
import { SpeechSynthesisVoice } from '@/types/speech';

export const stopSpeaking = (): void => {
  if (window.speechSynthesis) {
    console.log('[ENGINE] Stopping all speech');
    window.speechSynthesis.cancel();
    console.log('[ENGINE] All speech stopped');
  }
};

export const pauseSpeaking = (): void => {
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    console.log('[ENGINE] Pausing speech');
    window.speechSynthesis.pause();
  }
};

export const resumeSpeaking = (): void => {
  if (window.speechSynthesis && window.speechSynthesis.paused) {
    console.log('[ENGINE] Resuming speech');
    window.speechSynthesis.resume();
  }
};

export const keepSpeechAlive = (): void => {
  if (window.speechSynthesis) {
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
    // Uncomment for more verbose logging if needed
    // console.log('[ENGINE] Keeping speech alive (pause/resume)');
  }
};

export const waitForSpeechReadiness = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      console.error('[ENGINE] Speech synthesis not supported!');
      resolve(false);
      return;
    }
    console.log('[ENGINE] Waiting for speech readiness');
    setTimeout(() => {
      console.log('[ENGINE] Speech engine ready');
      resolve(true);
    }, 100);
  });
};

export const resetSpeechEngine = (): void => {
  if (window.speechSynthesis) {
    console.log('[ENGINE] Resetting speech engine');
    window.speechSynthesis.cancel();
  }
};

export const validateCurrentSpeech = (): boolean => {
  const isSpeaking = window.speechSynthesis ? window.speechSynthesis.speaking : false;
  console.log(`[ENGINE] Speech active: ${isSpeaking}`);
  return isSpeaking;
};

export const ensureSpeechEngineReady = async (): Promise<void> => {
  if (window.speechSynthesis) {
    console.log('[ENGINE] Preparing speech engine');
    window.speechSynthesis.cancel();
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log('[ENGINE] Speech engine prepared');
  }
};

export const isSpeechSynthesisSupported = (): boolean => {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  console.log(`[ENGINE] Speech synthesis supported: ${isSupported}`);
  return isSupported;
};

// Enhanced voices loading with explicit success/failure tracking
export const loadVoicesAndWait = async (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    let voicesLoaded = false;
    console.log('[ENGINE] Starting voice loading process');
    
    // Try to get voices immediately
    let voices = window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      console.log('[ENGINE] Voices already loaded:', voices.length);
      voicesLoaded = true;
      resolve(voices);
      return;
    }
    
    console.log('[ENGINE] Waiting for voices to load via event');
    
    // Set up an event listener for when voices change (are loaded)
    const voicesChangedHandler = () => {
      voices = window.speechSynthesis.getVoices();
      console.log('[ENGINE] Voices loaded via event:', voices.length);
      voicesLoaded = true;
      window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
      resolve(voices);
    };
    
    window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
    
    // Multi-stage fallback with increasingly longer timeouts
    const fallbackTimeouts = [500, 1000, 1500];
    
    fallbackTimeouts.forEach((timeout, index) => {
      setTimeout(() => {
        if (!voicesLoaded) {
          voices = window.speechSynthesis.getVoices();
          console.log(`[ENGINE] Voices check at ${timeout}ms:`, voices.length);
          
          // If we've found voices or this is our last attempt, resolve
          if (voices.length > 0 || index === fallbackTimeouts.length - 1) {
            window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
            console.log(`[ENGINE] Voices loaded via ${voices.length > 0 ? 'check' : 'final timeout'}:`, voices.length);
            voicesLoaded = true;
            resolve(voices);
          }
        }
      }, timeout);
    });
  });
};

// Improved speech function with better retry logic
export const speakWithRetry = async (
  utterance: SpeechSynthesisUtterance, 
  maxRetries: number = 3
): Promise<boolean> => {
  // Ensure voices are loaded first
  const voices = await loadVoicesAndWait();
  console.log(`[ENGINE] Loaded ${voices.length} voices for speech`);
  
  let attempts = 0;
  let success = false;
  
  while (attempts < maxRetries && !success) {
    attempts++;
    
    try {
      if (attempts > 1) {
        console.log(`[ENGINE] Retry attempt ${attempts} for speech`);
        // Reset speech synthesis before retrying
        window.speechSynthesis.cancel();
        await new Promise(r => setTimeout(r, 300));
      }
      
      window.speechSynthesis.speak(utterance);
      console.log(`[ENGINE] Speech initiated, attempt ${attempts}`);
      
      // Check if speech actually started
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          if (window.speechSynthesis.speaking) {
            console.log('[ENGINE] Speech successfully started');
            success = true;
            resolve();
          } else {
            console.warn('[ENGINE] Speech did not start properly');
            reject(new Error('Speech did not start'));
          }
        }, 200);
      });
      
      break; // Exit loop on success
    } catch (error) {
      console.error(`[ENGINE] Speech attempt ${attempts} failed:`, error);
      
      if (attempts >= maxRetries) {
        console.error('[ENGINE] Max retries reached, giving up');
        return false;
      }
      
      // Wait before next attempt with exponential backoff
      await new Promise(r => setTimeout(r, 300 * attempts));
    }
  }
  
  return success;
};
