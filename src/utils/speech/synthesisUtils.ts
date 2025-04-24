
import { SpeechSynthesisVoice } from '@/types/speech';

export const synthesizeAudio = (text: string, voice: SpeechSynthesisVoice | null): Promise<string> => {
  return new Promise((resolve, reject) => {
    console.log(`Synthesizing audio for text: "${text.substring(0, 30)}..."`);
    console.log(`Using voice: ${voice ? voice.name : 'default system voice'}`);
    
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
      console.log('Speech synthesis ended naturally');
      resolve('completed');
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      reject(new Error(`Speech error: ${event.error}`));
    };
    
    // Make sure any previous speech is cancelled
    window.speechSynthesis.cancel();
    
    // Ensure DOM has time to update before speaking
    setTimeout(() => {
      // Start the new speech
      window.speechSynthesis.speak(utterance);
      console.log('Speech synthesis started');
    }, 150); // Small delay to ensure DOM rendering is complete
  });
};
