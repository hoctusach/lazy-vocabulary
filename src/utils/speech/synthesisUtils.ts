
import { SpeechSynthesisVoice } from '@/types/speech';

export const synthesizeAudio = (text: string, voice: SpeechSynthesisVoice | null): string => {
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
  
  // Start speaking - adding a small delay to ensure the speech synthesis is ready
  setTimeout(() => {
    // Make sure any previous speech is cancelled
    window.speechSynthesis.cancel();
    
    // Start the new speech
    window.speechSynthesis.speak(utterance);
    
    console.log('Speech synthesis started');
  }, 100);
  
  // Return a special marker to indicate we're using native speech synthesis
  return 'native-speech://speaking'; 
};
