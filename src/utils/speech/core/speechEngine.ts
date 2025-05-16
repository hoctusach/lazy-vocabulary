
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

// Ensure voices are loaded before speaking
export const loadVoicesAndWait = async (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    // Try to get voices immediately
    let voices = window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      console.log('[ENGINE] Voices already loaded:', voices.length);
      resolve(voices);
      return;
    }
    
    console.log('[ENGINE] Waiting for voices to load');
    
    // Set up an event listener for when voices change (are loaded)
    const voicesChangedHandler = () => {
      voices = window.speechSynthesis.getVoices();
      console.log('[ENGINE] Voices loaded via event:', voices.length);
      window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
      resolve(voices);
    };
    
    window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
    
    // Fallback: If event doesn't fire within a reasonable time, resolve anyway
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
      voices = window.speechSynthesis.getVoices();
      console.log('[ENGINE] Voices loaded via timeout:', voices.length);
      resolve(voices);
    }, 1000);
  });
};

// Safe speech function that ensures voices are loaded first
export const speakWithRetry = async (
  utterance: SpeechSynthesisUtterance, 
  maxRetries: number = 3
): Promise<boolean> => {
  // Ensure voices are loaded
  await loadVoicesAndWait();
  
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
      
      // Wait before next attempt
      await new Promise(r => setTimeout(r, 300));
    }
  }
  
  return success;
};
