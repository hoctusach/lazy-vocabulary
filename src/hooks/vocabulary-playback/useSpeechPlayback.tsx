
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceOption } from './useVoiceSelection';

export const useSpeechPlayback = (
  utteranceRef: React.MutableRefObject<SpeechSynthesisUtterance | null>,
  selectedVoice: VoiceOption,
  advanceToNext: () => void,
  muted: boolean,
  paused: boolean
) => {
  // Function to play the current word
  const playWord = useCallback((wordToPlay: VocabularyWord | null) => {
    // First ensure we have a word to play and are not muted/paused
    if (!wordToPlay || muted || paused) {
      return;
    }
    
    console.log(`Playing word: ${wordToPlay.word}`);
    
    // Cancel any ongoing speech to prevent queuing
    window.speechSynthesis.cancel();
    
    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance();
    utteranceRef.current = utterance;
    
    // Build the text to speak with proper pauses
    const wordText = wordToPlay.word;
    const meaningText = wordToPlay.meaning;
    const exampleText = wordToPlay.example;
    
    utterance.text = `${wordText}. ${meaningText}. ${exampleText}`;
    
    // Set the selected voice if available
    if (selectedVoice.voice) {
      utterance.voice = selectedVoice.voice;
      utterance.lang = selectedVoice.voice.lang;
    }
    
    // Configure speech properties
    utterance.rate = 0.9; // Slightly slower for better comprehension
    utterance.pitch = 1;
    
    // Set up event handlers for auto-advancement
    utterance.onend = () => {
      console.log(`Speech ended for: ${wordToPlay.word}`);
      
      // Only auto-advance if not paused and not muted
      if (!paused && !muted) {
        // Advance to the next word
        advanceToNext();
      }
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      
      // On error, also advance to next word to prevent getting stuck
      if (!paused && !muted) {
        advanceToNext();
      }
    };
    
    // Start speaking
    window.speechSynthesis.speak(utterance);
  }, [utteranceRef, selectedVoice, advanceToNext, muted, paused]);
  
  return {
    playWord
  };
};
