
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
  const voicesLoadedRef = useRef(false);
  const speakingFailedRef = useRef(false);

  // Function to ensure voices are loaded before speaking
  const ensureVoicesLoaded = useCallback((): Promise<SpeechSynthesisVoice[]> => {
    return new Promise((resolve) => {
      console.log("Ensuring voices are loaded...");
      const voices = window.speechSynthesis.getVoices();
      
      if (voices.length > 0) {
        console.log(`Voices already loaded: ${voices.length} voices available`);
        voicesLoadedRef.current = true;
        resolve(voices);
        return;
      }

      // If no voices available, wait for the voiceschanged event
      console.log("No voices available yet, waiting for voiceschanged event...");
      const voicesChangedHandler = () => {
        const newVoices = window.speechSynthesis.getVoices();
        console.log(`Voices loaded via event: ${newVoices.length} voices available`);
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        voicesLoadedRef.current = true;
        resolve(newVoices);
      };

      window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);

      // Fallback timeout in case the event never fires
      setTimeout(() => {
        if (!voicesLoadedRef.current) {
          console.log("Voices timeout reached, using whatever voices are available");
          window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
          const availableVoices = window.speechSynthesis.getVoices();
          console.log(`Fallback voices: ${availableVoices.length} voices available`);
          voicesLoadedRef.current = true;
          resolve(availableVoices);
        }
      }, 2000);
    });
  }, []);

  // Function to play the current word
  const playWord = useCallback(async (wordToPlay: VocabularyWord | null) => {
    // First ensure we have a word to play and are not muted/paused
    if (!wordToPlay || muted || paused) {
      console.log(`Cannot play word: ${!wordToPlay ? 'No word' : muted ? 'Muted' : 'Paused'}`);
      return;
    }
    
    console.log(`Playing word: ${wordToPlay.word}`);
    retryAttemptsRef.current = 0;
    speakingFailedRef.current = false;
    
    // Cancel any ongoing speech to prevent queuing
    window.speechSynthesis.cancel();
    
    try {
      // Wait for voices to load before attempting to speak
      console.log("Loading voices before speaking...");
      const voices = await ensureVoicesLoaded();
      console.log(`Loaded ${voices.length} voices, proceeding with speech...`);
      
      // Create a new utterance
      const utterance = new SpeechSynthesisUtterance();
      
      // Clear any previous utterance references to prevent memory leaks
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
        utteranceRef.current.onstart = null;
      }
      
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
        console.log(`Speech ended successfully for: ${wordToPlay.word}`);
        retryAttemptsRef.current = 0;
        
        // Only auto-advance if not paused and not muted
        if (!paused && !muted) {
          console.log("Auto-advancing to next word after successful speech");
          advanceToNext();
        }
      };
      
      utterance.onstart = () => {
        console.log(`Speech started for: ${wordToPlay.word}`);
      };
      
      utterance.onerror = (event) => {
        console.error(`Speech synthesis error: ${event.error} for word ${wordToPlay.word}`);
        
        // Mark that we had a failure
        speakingFailedRef.current = true;
        
        // For not-allowed errors, try to recover
        if (event.error === 'not-allowed') {
          console.log('Detected not-allowed error, attempting to retry...');
          
          // Try to resume speech
          window.speechSynthesis.resume();
          
          // Increment retry counter
          retryAttemptsRef.current++;
          
          if (retryAttemptsRef.current <= maxRetryAttempts) {
            // Wait and retry
            setTimeout(() => {
              if (muted || paused) {
                console.log("Skipping retry due to mute/pause state change");
                return;
              }
              
              try {
                console.log(`Retry attempt ${retryAttemptsRef.current}/${maxRetryAttempts}`);
                window.speechSynthesis.speak(utterance);
              } catch (err) {
                console.error("Speech retry failed:", err);
                // If retry fails, advance to next word
                if (!paused && !muted) {
                  console.log("Advancing to next word after failed retry");
                  advanceToNext();
                }
              }
            }, 500);
          } else {
            // Max retries reached, move to next word
            console.log(`Max retries (${maxRetryAttempts}) reached, advancing to next word`);
            if (!paused && !muted) {
              advanceToNext();
            }
          }
        } 
        // For other error types
        else {
          retryAttemptsRef.current++;
          
          // If we haven't tried too many times already, retry
          if (retryAttemptsRef.current <= maxRetryAttempts) {
            console.log(`Attempting retry ${retryAttemptsRef.current}/${maxRetryAttempts} after error`);
            setTimeout(() => {
              if (!paused && !muted) {
                try {
                  window.speechSynthesis.speak(utterance);
                } catch (e) {
                  console.error("Retry failed:", e);
                  // Move on if retry fails
                  advanceToNext();
                }
              }
            }, 300);
          } else {
            // Too many retries, just move on
            console.log("Too many retries, advancing to next word");
            if (!paused && !muted) {
              advanceToNext();
            }
          }
        }
      };
      
      // Start speaking with a small delay to ensure setup is complete
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
          console.log('Speaking with voice:', utterance.voice ? utterance.voice.name : 'default system voice');
          
          // Verify speech is working after a short delay
          setTimeout(() => {
            if (!window.speechSynthesis.speaking && !speakingFailedRef.current) {
              console.warn("Speech synthesis not speaking after 200ms - potential silent failure");
              
              // If not speaking and we haven't seen an error, try again once
              if (retryAttemptsRef.current === 0) {
                console.log("Silent failure detected, retrying once");
                retryAttemptsRef.current++;
                try {
                  window.speechSynthesis.speak(utterance);
                } catch (e) {
                  console.error("Silent failure retry failed:", e);
                  // If retry fails, advance to next word
                  if (!paused && !muted) {
                    advanceToNext();
                  }
                }
              } else if (!paused && !muted) {
                // If we already retried, just move on
                console.log("Silent failure persists, advancing to next word");
                advanceToNext();
              }
            }
          }, 200);
        } catch (error) {
          console.error('Error starting speech:', error);
          // Still advance to next word after a delay to prevent getting stuck
          if (!paused && !muted) {
            setTimeout(advanceToNext, 1000);
          }
        }
      }, 100);
    } catch (error) {
      console.error("Error in playWord function:", error);
      // Always advance to prevent getting stuck
      if (!paused && !muted) {
        setTimeout(advanceToNext, 1000);
      }
    }
  }, [utteranceRef, selectedVoice, advanceToNext, muted, paused, ensureVoicesLoaded, maxRetryAttempts]);
  
  return {
    playWord
  };
};
