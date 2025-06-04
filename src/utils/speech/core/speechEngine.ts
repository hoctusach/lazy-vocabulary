
import { SpeechSynthesisVoice } from '@/types/speech';

// Track last operation time to prevent rapid successive operations
let lastOperationTime = 0;
const MIN_OPERATION_INTERVAL = 200; // Minimum time between operations

const canPerformOperation = (): boolean => {
  const now = Date.now();
  if (now - lastOperationTime < MIN_OPERATION_INTERVAL) {
    return false;
  }
  lastOperationTime = now;
  return true;
};

export const stopSpeaking = (): void => {
  if (!canPerformOperation()) {
    console.log('[ENGINE] Operation throttled to prevent speech loops');
    return;
  }
  
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    console.log('[ENGINE] Stopping ongoing speech');
    window.speechSynthesis.cancel();
    console.log('[ENGINE] Speech stopped');
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
    }, 300); // Longer delay for stability
  });
};

export const resetSpeechEngine = (): void => {
  if (!canPerformOperation()) {
    return;
  }
  
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
    
    // Only cancel if something is actually speaking
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      await new Promise(resolve => setTimeout(resolve, 300)); // Longer wait
    }
    
    console.log('[ENGINE] Speech engine prepared');
  }
};

export const isSpeechSynthesisSupported = (): boolean => {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  console.log(`[ENGINE] Speech synthesis supported: ${isSupported}`);
  return isSupported;
};

// Improved unlockAudio function that doesn't create competing audio streams
export const unlockAudio = (): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      console.log('[ENGINE] Attempting to unlock audio...');
      
      // Simple approach - just create an AudioContext if available
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        console.log('[ENGINE] AudioContext not supported, using speech directly');
        resolve(true);
        return;
      }
      
      try {
        const context = new AudioContext();
        
        // Resume the audio context if needed
        if (context.state === 'suspended') {
          context.resume().then(() => {
            console.log('[ENGINE] AudioContext resumed');
            resolve(true);
          }).catch(err => {
            console.warn('[ENGINE] Failed to resume AudioContext:', err);
            resolve(true); // Still consider it unlocked
          });
        } else {
          console.log('[ENGINE] AudioContext ready');
          resolve(true);
        }
      } catch (e) {
        console.warn('[ENGINE] AudioContext creation failed:', e);
        resolve(true); // Still allow speech synthesis to try
      }
    } catch (e) {
      console.warn('[ENGINE] Audio unlock failed, continuing anyway:', e);
      resolve(true);
    }
  });
};

// Enhanced voices loading with better timing
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
    
    // Set up an event listener for when voices change
    const voicesChangedHandler = () => {
      if (voicesLoaded) return; // Prevent multiple calls
      
      voices = window.speechSynthesis.getVoices();
      console.log('[ENGINE] Voices loaded via event:', voices.length);
      
      if (voices.length > 0) {
        voicesLoaded = true;
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        resolve(voices);
      }
    };
    
    window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
    
    // Fallback timeouts with longer delays
    const fallbackTimeouts = [1000, 2000, 3000];
    
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

// Improved speech function with better error handling
export const speakWithRetry = async (
  utterance: SpeechSynthesisUtterance, 
  maxRetries: number = 2 // Reduced retries
): Promise<boolean> => {
  // Unlock audio first
  await unlockAudio();
  
  // Ensure voices are loaded
  const voices = await loadVoicesAndWait();
  console.log(`[ENGINE] Loaded ${voices.length} voices for speech`);
  
  let attempts = 0;
  let success = false;
  
  while (attempts < maxRetries && !success) {
    attempts++;
    
    try {
      if (attempts > 1) {
        console.log(`[ENGINE] Retry attempt ${attempts} for speech`);
        // Only cancel and wait if there's actually ongoing speech
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          await new Promise(r => setTimeout(r, 500)); // Longer wait
        }
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
        }, 400); // Longer check delay
      });
      
      break; // Exit loop on success
    } catch (error) {
      console.error(`[ENGINE] Speech attempt ${attempts} failed:`, error);
      
      if (attempts >= maxRetries) {
        console.error('[ENGINE] Max retries reached, giving up');
        return false;
      }
      
      // Wait before next attempt with longer delays
      await new Promise(r => setTimeout(r, 500 * attempts));
    }
  }
  
  return success;
};
