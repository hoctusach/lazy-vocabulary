
import { useCallback, useEffect } from 'react';
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
      console.log(`Using voice: ${selectedVoice.voice.name} (${selectedVoice.voice.lang})`);
    } else {
      console.log('No voice available, using browser default');
    }
    
    // Configure speech properties
    utterance.rate = 0.9; // Slightly slower for better comprehension
    utterance.pitch = 1;
    utterance.volume = 1.0; // Ensure volume is at maximum
    
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
      
      if (event.error === 'not-allowed') {
        console.log('Detected not-allowed error, attempting to retry...');
        
        // For not-allowed errors, try to resume speech and retry once
        window.speechSynthesis.resume();
        
        // Wait a moment and try one more time
        setTimeout(() => {
          try {
            // Force loading voices before retry
            window.speechSynthesis.getVoices();
            window.speechSynthesis.speak(utterance);
            console.log('Second attempt after not-allowed error');
          } catch (secondError) {
            console.error('Retry failed:', secondError);
          }
        }, 100);
      } else {
        // On other errors, also advance to next word to prevent getting stuck
        if (!paused && !muted) {
          advanceToNext();
        }
      }
    };
    
    // To avoid "not-allowed" errors, we need to ensure voices are loaded
    window.speechSynthesis.getVoices();
    
    // Start speaking with a small delay
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
        console.log('Speaking with voice:', utterance.voice ? utterance.voice.name : 'default system voice');
      } catch (error) {
        console.error('Error starting speech:', error);
      }
    }, 100);
  }, [utteranceRef, selectedVoice, advanceToNext, muted, paused]);
  
  return {
    playWord
  };
};
