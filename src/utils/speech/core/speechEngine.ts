
import { SpeechSynthesisVoice } from '@/types/speech';

// Track last operation time to prevent rapid successive operations
let lastOperationTime = 0;
const MIN_OPERATION_INTERVAL = 100; // Reduced interval for better responsiveness

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
  
  console.log('[ENGINE] Stopping speech - current state:', {
    speaking: window.speechSynthesis?.speaking,
    paused: window.speechSynthesis?.paused,
    pending: window.speechSynthesis?.pending
  });
  
  if (window.speechSynthesis) {
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
    }, 200); // Reduced delay for better responsiveness
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
  console.log(`[ENGINE] Speech validation - speaking: ${isSpeaking}, paused: ${window.speechSynthesis?.paused}`);
  return isSpeaking;
};

export const ensureSpeechEngineReady = async (): Promise<void> => {
  if (window.speechSynthesis) {
    console.log('[ENGINE] Preparing speech engine');
    
    // Only cancel if something is actually speaking
    if (window.speechSynthesis.speaking) {
      console.log('[ENGINE] Canceling existing speech');
      window.speechSynthesis.cancel();
      await new Promise(resolve => setTimeout(resolve, 150)); // Reduced wait time
    }
    
    console.log('[ENGINE] Speech engine prepared');
  }
};

export const isSpeechSynthesisSupported = (): boolean => {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  console.log(`[ENGINE] Speech synthesis supported: ${isSupported}`);
  return isSupported;
};

// Enhanced unlockAudio function with better error handling
export const unlockAudio = (): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      console.log('[ENGINE] Attempting to unlock audio context...');
      
      interface WindowWithWebAudio extends Window {
        webkitAudioContext?: typeof globalThis.AudioContext;
      }

      const AudioContext =
        window.AudioContext || (window as WindowWithWebAudio).webkitAudioContext;
      
      if (!AudioContext) {
        console.log('[ENGINE] AudioContext not supported, proceeding with speech synthesis');
        resolve(true);
        return;
      }
      
      try {
        const context = new AudioContext();
        
        console.log('[ENGINE] AudioContext created, state:', context.state);
        
        if (context.state === 'suspended') {
          context.resume().then(() => {
            console.log('[ENGINE] ✓ AudioContext resumed successfully');
            resolve(true);
          }).catch(err => {
            console.warn('[ENGINE] Failed to resume AudioContext:', err);
            resolve(true); // Still allow speech synthesis to try
          });
        } else {
          console.log('[ENGINE] ✓ AudioContext already ready');
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

// Enhanced voice loading with comprehensive monitoring
export const loadVoicesAndWait = async (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    let voicesLoaded = false;
    const startTime = Date.now();
    console.log('[ENGINE] === Voice Loading Process Started ===');
    
    // Try to get voices immediately
    let voices = window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      console.log('[ENGINE] ✓ Voices already available:', voices.length);
      voicesLoaded = true;
      resolve(voices);
      return;
    }
    
    console.log('[ENGINE] Waiting for voices to load via event listener');
    
    // Set up event listener for when voices change
    const voicesChangedHandler = () => {
      if (voicesLoaded) return; // Prevent multiple calls
      
      voices = window.speechSynthesis.getVoices();
      const elapsed = Date.now() - startTime;
      console.log(`[ENGINE] ✓ Voices loaded via event (${elapsed}ms):`, voices.length);
      
      if (voices.length > 0) {
        voicesLoaded = true;
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        resolve(voices);
      }
    };
    
    window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
    
    // Enhanced fallback with multiple checkpoints
    const checkpoints = [500, 1000, 1500, 2000, 3000];
    
    checkpoints.forEach((timeout, index) => {
      setTimeout(() => {
        if (!voicesLoaded) {
          voices = window.speechSynthesis.getVoices();
          const elapsed = Date.now() - startTime;
          console.log(`[ENGINE] Checkpoint ${index + 1} (${elapsed}ms): ${voices.length} voices`);
          
          // Resolve if we found voices or this is our final attempt
          if (voices.length > 0 || index === checkpoints.length - 1) {
            if (!voicesLoaded) {
              window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
              console.log(`[ENGINE] ✓ Voice loading complete (${elapsed}ms): ${voices.length} voices`);
              voicesLoaded = true;
              resolve(voices);
            }
          }
        }
      }, timeout);
    });
  });
};

// Enhanced speech function with comprehensive monitoring
export const speakWithRetry = async (
  utterance: SpeechSynthesisUtterance, 
  maxRetries: number = 2
): Promise<boolean> => {
  console.log('[ENGINE] === Starting Enhanced Speech Process ===');
  
  // Ensure audio is unlocked
  await unlockAudio();
  
  // Ensure voices are loaded
  const voices = await loadVoicesAndWait();
  console.log(`[ENGINE] Voice preparation complete: ${voices.length} voices available`);
  
  let attempts = 0;
  let success = false;
  
  while (attempts < maxRetries && !success) {
    attempts++;
    const attemptId = Math.random().toString(36).substring(7);
    
    try {
      console.log(`[ENGINE-${attemptId}] Attempt ${attempts}/${maxRetries}`);
      
      if (attempts > 1) {
        // Clean up before retry
        if (window.speechSynthesis.speaking) {
          console.log(`[ENGINE-${attemptId}] Canceling previous speech before retry`);
          window.speechSynthesis.cancel();
          await new Promise(r => setTimeout(r, 300));
        }
      }
      
      console.log(`[ENGINE-${attemptId}] Initiating speech synthesis`);
      window.speechSynthesis.speak(utterance);
      
      // Enhanced speech validation with multiple checks
      const validationResult = await new Promise<boolean>((resolve, reject) => {
        let checkCount = 0;
        const maxChecks = 8;
        
        const validateSpeech = () => {
          checkCount++;
          console.log(`[ENGINE-${attemptId}] Validation check ${checkCount}/${maxChecks}`);
          
          if (window.speechSynthesis.speaking) {
            console.log(`[ENGINE-${attemptId}] ✓ Speech successfully validated`);
            resolve(true);
            return;
          }
          
          if (checkCount >= maxChecks) {
            console.warn(`[ENGINE-${attemptId}] ✗ Speech validation failed after ${maxChecks} checks`);
            reject(new Error('Speech validation timeout'));
            return;
          }
          
          // Continue checking
          setTimeout(validateSpeech, 100);
        };
        
        // Start validation after initial delay
        setTimeout(validateSpeech, 200);
      });
      
      if (validationResult) {
        success = true;
        console.log(`[ENGINE-${attemptId}] ✓ Speech successfully initiated`);
      }
      
      break; // Exit loop on success
      
    } catch (error) {
      console.error(`[ENGINE-${attemptId}] ✗ Attempt ${attempts} failed:`, error);
      
      if (attempts >= maxRetries) {
        console.error(`[ENGINE] ✗ All ${maxRetries} attempts failed`);
        return false;
      }
      
      // Wait before next attempt
      const delay = 300 * attempts;
      console.log(`[ENGINE-${attemptId}] Waiting ${delay}ms before retry`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  
  console.log(`[ENGINE] Speech process complete: ${success ? 'SUCCESS' : 'FAILED'}`);
  return success;
};
