
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '../useVoiceSelection';
import { findVoice } from './findVoice';

// Function to create and configure a speech utterance
export const createUtterance = (
  word: VocabularyWord,
  selectedVoice: VoiceSelection,
  voices: SpeechSynthesisVoice[],
  onEnd: () => void,
  onStart: () => void,
  onError: (e: SpeechSynthesisErrorEvent) => void
): SpeechSynthesisUtterance => {
  // Create a new utterance object
  const utterance = new SpeechSynthesisUtterance();
  
  try {
    // Construct the text to speak
    // Add periods to create pauses between sections
    let textToSpeak = `${word.word}`;
    
    if (word.meaning && word.meaning.trim().length > 0) {
      textToSpeak += `. ${word.meaning}`;
    }
    
    if (word.example && word.example.trim().length > 0) {
      textToSpeak += `. ${word.example}`;
    }
    
    // Set the final text
    utterance.text = textToSpeak;
    
    // Find the appropriate voice
    const voice = findVoice(voices, selectedVoice);
    
    // Apply voice if found
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang; // Use the voice's language setting
      console.log(`Using voice: ${voice.name} (${voice.lang})`);
    } else {
      // Fallback language settings if no voice is found
      utterance.lang = selectedVoice.region === 'US' ? 'en-US' : 'en-GB';
      console.log(`No voice found, using default with language: ${utterance.lang}`);
    }
    
    // Configure speech properties for better clarity
    utterance.rate = 0.95;  // Slightly slower than default for better comprehension
    utterance.pitch = 1.0;  // Default pitch
    utterance.volume = 1.0; // Full volume
    
    // Register event handlers
    utterance.onend = (e) => {
      console.log('Speech ended successfully');
      if (onEnd) onEnd();
    };
    
    utterance.onstart = (e) => {
      console.log('Speech started successfully');
      if (onStart) onStart();
    };
    
    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      if (onError) onError(e);
    };
    
  } catch (error) {
    console.error('Error creating utterance:', error);
    // Still return the utterance even if there was an error in setup
    // This allows the caller to handle the error gracefully
  }
  
  return utterance;
};
