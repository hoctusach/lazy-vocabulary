
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '../useVoiceSelection';
import { findVoice } from './findVoice';

// Create and configure utterance for a word
export const createUtterance = (
  wordToPlay: VocabularyWord,
  selectedVoice: VoiceSelection,
  voices: SpeechSynthesisVoice[],
  onEndCallback: () => void,
  onStartCallback: () => void,
  onErrorCallback: (event: SpeechSynthesisErrorEvent) => void
): SpeechSynthesisUtterance => {
  // Build the text to speak with proper pauses
  const wordText = wordToPlay.word;
  const meaningText = wordToPlay.meaning;
  const exampleText = wordToPlay.example;
  
  const utterance = new SpeechSynthesisUtterance();
  utterance.text = `${wordText}. ${meaningText}. ${exampleText}`;
  
  // Find the correct voice based on selected voice settings
  const voice = findVoice(voices, selectedVoice);
  
  // Set the selected voice if available
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
    console.log(`Using voice: ${voice.name} (${voice.lang})`);
  } else {
    console.log('No voice available, using browser default');
    // Set at least the language based on region
    utterance.lang = selectedVoice.region === 'US' ? 'en-US' : 'en-GB';
  }
  
  // Configure speech properties
  utterance.rate = 0.9; // Slightly slower for better comprehension
  utterance.pitch = 1;
  utterance.volume = 1.0; // Ensure volume is at maximum
  
  // Set up event handlers
  utterance.onend = onEndCallback;
  utterance.onstart = onStartCallback;
  utterance.onerror = onErrorCallback;
  
  return utterance;
};
