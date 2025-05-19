
import { useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';

/**
 * Hook for managing utterance setup and reference
 */
export const useUtteranceManager = () => {
  // Reference to the current utterance
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Function to create and configure an utterance
  const createUtterance = useCallback((
    word: VocabularyWord, 
    selectedVoice: VoiceSelection,
    findVoice: (region: 'US' | 'UK') => SpeechSynthesisVoice | null,
    onStart: () => void,
    onEnd: () => void,
    onError: (e: SpeechSynthesisErrorEvent) => void
  ) => {
    // Cancel any existing utterance
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current.onstart = null;
    }
    
    // Create new utterance
    const utterance = new SpeechSynthesisUtterance();
    
    // Set up text
    utterance.text = `${word.word}. ${word.meaning}. ${word.example}`;
    
    // Set up voice
    const voice = findVoice(selectedVoice.region);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
      console.log(`Using voice: ${voice.name}`);
    } else {
      console.log('No matching voice found, using default');
      utterance.lang = selectedVoice.region === 'US' ? 'en-US' : 'en-GB';
    }
    
    // Configure properties
    utterance.rate = 0.9; // Slightly slower for better comprehension
    utterance.pitch = 1;
    utterance.volume = 1.0;
    
    // Set up handlers
    utterance.onstart = onStart;
    utterance.onend = onEnd;
    utterance.onerror = onError;
    
    // Set reference and return
    utteranceRef.current = utterance;
    return utterance;
  }, []);
  
  return {
    utteranceRef,
    createUtterance
  };
};
