import { DEFAULT_SPEECH_RATE } from '@/services/speech/core/constants';

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
      console.log(`[SYNTHESIS] Set voice: ${voice.name} (${voice.lang})`);
    } else {
      console.log('[SYNTHESIS] No voice provided, using browser default');
    }
    
    // Set reasonable speech parameters
    utterance.rate = DEFAULT_SPEECH_RATE;
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
        // If error is 'not-allowed', try to resume speech and retry once
        console.log('[SYNTHESIS] Attempting to resume speech after not-allowed error');
        window.speechSynthesis.resume();
        
        // Wait a moment and try one more time
        setTimeout(() => {
          try {
            window.speechSynthesis.speak(utterance);
            console.log('[SYNTHESIS] Second attempt after not-allowed error');
          } catch (secondError) {
            reject(new Error('not-allowed'));
          }
        }, 100);
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
      // Ensure voices are loaded before speaking
      window.speechSynthesis.getVoices();
      
      // Short delay before speaking to ensure system is ready
      setTimeout(() => {
        try {
          // Start the speech
          window.speechSynthesis.speak(utterance);
          console.log('[SYNTHESIS] Speech synthesis started');
          
          // Verification log to confirm correct voice is being used
          if (utterance.voice) {
            console.log('[SYNTHESIS] Speaking with voice:', utterance.voice.name);
          } else {
            console.log('[SYNTHESIS] Speaking with default system voice');
          }
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
