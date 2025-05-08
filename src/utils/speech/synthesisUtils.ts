
import { SpeechSynthesisVoice } from '@/types/speech';

export const synthesizeAudio = (text: string, voice: SpeechSynthesisVoice | null): Promise<string> => {
  return new Promise((resolve, reject) => {
    console.log(`[SYNTHESIS] Starting synthesis for: "${text.substring(0, 30)}..."`);
    console.log(`[SYNTHESIS] Using voice: ${voice ? voice.name : 'default system voice'}`);
    
    // Make sure any previous speech is cancelled
    window.speechSynthesis.cancel();
    console.log('[SYNTHESIS] Cancelled previous speech');
    
    // Create a speech utterance with properly configured settings
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set the voice if provided
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    
    // Set reasonable speech parameters
    utterance.rate = 0.9;  // Slightly slower than default for better clarity
    utterance.pitch = 1.0; // Normal pitch
    utterance.volume = 1.0; // Full volume
    
    // Set up event handlers for proper promise resolution
    utterance.onend = () => {
      console.log('[SYNTHESIS] Speech synthesis completed naturally');
      resolve('completed');
    };
    
    utterance.onstart = () => {
      console.log('[SYNTHESIS] Speech synthesis actually started');
    };
    
    utterance.onerror = (event) => {
      console.error('[SYNTHESIS] Speech synthesis error:', event.error);
      
      if (event.error === 'not-allowed') {
        reject(new Error('not-allowed'));
      } else if (event.error === 'interrupted') {
        // This is often expected when stopping speech, don't treat as a failure
        console.log('[SYNTHESIS] Speech interrupted - likely intentional');
        resolve('interrupted');
      } else if (event.error === 'canceled') {
        // Similarly, cancellation is often intentional
        console.log('[SYNTHESIS] Speech canceled - likely intentional');
        resolve('canceled');
      } else {
        // For other errors, reject with details
        reject(new Error(`Speech error: ${event.error}`));
      }
    };
    
    utterance.onpause = () => {
      console.log('[SYNTHESIS] Speech paused');
    };
    
    utterance.onresume = () => {
      console.log('[SYNTHESIS] Speech resumed');
    };
    
    // Use try-catch to handle potential errors during speech initiation
    try {
      // Short delay before speaking to ensure system is ready
      setTimeout(() => {
        try {
          // Start the speech
          window.speechSynthesis.speak(utterance);
          console.log('[SYNTHESIS] Speech synthesis started');
        } catch (error) {
          console.error('[SYNTHESIS] Error calling speechSynthesis.speak():', error);
          reject(error);
        }
      }, 100);
    } catch (error) {
      console.error('[SYNTHESIS] Error in speech synthesis setup:', error);
      reject(error);
    }
  });
};
