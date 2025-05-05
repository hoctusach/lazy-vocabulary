
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
      reject(new Error(`Speech error: ${event.error}`));
    };
    
    // Short delay before speaking to ensure system is ready
    setTimeout(() => {
      // Start the speech
      window.speechSynthesis.speak(utterance);
      console.log('[SYNTHESIS] Speech synthesis started');
    }, 100);
  });
};
