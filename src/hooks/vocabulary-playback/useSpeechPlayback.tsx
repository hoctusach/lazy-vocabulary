
import { useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceOption } from './useVoiceSelection';

export const useSpeechPlayback = (
  utteranceRef: React.MutableRefObject<SpeechSynthesisUtterance | null>,
  selectedVoice: VoiceOption,
  advanceToNext: () => void,
  muted: boolean,
  paused: boolean
) => {
  // Track retry attempts
  const retryAttemptsRef = useRef(0);
  const maxRetryAttempts = 3;

  // Function to ensure voices are loaded before speaking
  const ensureVoicesLoaded = useCallback((): Promise<SpeechSynthesisVoice[]> => {
    return new Promise((resolve) => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
        return;
      }

      // If no voices available, wait for the voiceschanged event
      const voicesChangedHandler = () => {
        const newVoices = window.speechSynthesis.getVoices();
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        resolve(newVoices);
      };

      window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);

      // Fallback timeout in case the event never fires
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        resolve(window.speechSynthesis.getVoices());
      }, 1000);
    });
  }, []);

  // Function to play the current word
  const playWord = useCallback(async (wordToPlay: VocabularyWord | null) => {
    // First ensure we have a word to play and are not muted/paused
    if (!wordToPlay || muted || paused) {
      return;
    }
    
    console.log(`Playing word: ${wordToPlay.word}`);
    
    // Cancel any ongoing speech to prevent queuing
    window.speechSynthesis.cancel();
    
    // Wait for voices to load
    await ensureVoicesLoaded();
    
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
      retryAttemptsRef.current = 0;
      
      // Only auto-advance if not paused and not muted
      if (!paused && !muted) {
        // Advance to the next word
        advanceToNext();
      }
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      retryAttemptsRef.current++;
      
      if (event.error === 'not-allowed') {
        console.log('Detected not-allowed error, attempting to retry...');
        
        // For not-allowed errors, try to resume speech and retry once
        window.speechSynthesis.resume();
        
        // Wait a moment and try one more time
        setTimeout(() => {
          try {
            // Force loading voices before retry
            window.speechSynthesis.getVoices();
            if (retryAttemptsRef.current <= maxRetryAttempts) {
              window.speechSynthesis.speak(utterance);
              console.log('Second attempt after not-allowed error');
            } else {
              // If we've tried too many times, move on to the next word
              if (!paused && !muted) {
                console.log('Max retries exceeded, moving to next word');
                retryAttemptsRef.current = 0;
                advanceToNext();
              }
            }
          } catch (secondError) {
            console.error('Retry failed:', secondError);
            // Even if the retry fails, advance to next word to prevent getting stuck
            if (!paused && !muted) {
              advanceToNext();
            }
          }
        }, 300);
      } else {
        // For other errors, also advance to next word to prevent getting stuck
        if (!paused && !muted && retryAttemptsRef.current > maxRetryAttempts) {
          retryAttemptsRef.current = 0;
          console.log('Advancing to next word after error');
          advanceToNext();
        } else if (!paused && !muted) {
          // Try again for non-fatal errors
          setTimeout(() => {
            try {
              window.speechSynthesis.speak(utterance);
              console.log(`Retry attempt ${retryAttemptsRef.current}`);
            } catch (retryError) {
              console.error('Retry attempt failed:', retryError);
              // If retry fails, move to next word
              if (retryAttemptsRef.current >= maxRetryAttempts) {
                retryAttemptsRef.current = 0;
                advanceToNext();
              }
            }
          }, 500);
        }
      }
    };
    
    // Clean up any previous utterance event listeners
    if (utteranceRef.current !== null) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current.onstart = null;
      utteranceRef.current.onpause = null;
      utteranceRef.current.onresume = null;
    }
    
    // To avoid "not-allowed" errors, ensure voices are loaded
    const voices = window.speechSynthesis.getVoices();
    console.log(`Available voices: ${voices.length}`);
    
    // Start speaking with a small delay to ensure everything is set up
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
        console.log('Speaking with voice:', utterance.voice ? utterance.voice.name : 'default system voice');
      } catch (error) {
        console.error('Error starting speech:', error);
        // If initial speak fails, still advance to next word after a delay
        if (!paused && !muted) {
          setTimeout(advanceToNext, 1500);
        }
      }
    }, 100);
  }, [utteranceRef, selectedVoice, advanceToNext, muted, paused, ensureVoicesLoaded, maxRetryAttempts]);
  
  return {
    playWord
  };
};
