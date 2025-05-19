
import { useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '../useVoiceSelection';

/**
 * Hook for managing word playback functionality
 */
export const useWordPlayback = (
  wordList: VocabularyWord[],
  currentIndex: number,
  setCurrentIndex: (index: number) => void,
  muted: boolean,
  paused: boolean,
  cancelSpeech: () => void,
  findVoice: (region: 'US' | 'UK') => SpeechSynthesisVoice | null,
  selectedVoice: VoiceSelection,
  userInteractionRef: React.MutableRefObject<boolean>,
  setIsSpeaking: (isSpeaking: boolean) => void,
  speakingRef: React.MutableRefObject<boolean>,
  resetRetryAttempts: () => void,
  incrementRetryAttempts: () => boolean,
  checkSpeechSupport: () => boolean
) => {
  // Reference to the current utterance
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Get the current word based on the index
  const currentWord = wordList.length > 0 ? wordList[currentIndex] : null;
  
  // Function to advance to next word with full cleanup
  const goToNextWord = useCallback(() => {
    if (wordList.length === 0) return;
    
    // Cancel any ongoing speech
    cancelSpeech();
    
    // Move to next word with a circular index
    setCurrentIndex((prevIndex) => {
      const nextIndex = (prevIndex + 1) % wordList.length;
      console.log(`Moving to word ${nextIndex}: ${wordList[nextIndex]?.word || 'unknown'}`);
      return nextIndex;
    });
    
    // Reset retry attempts for the new word
    resetRetryAttempts();
  }, [wordList, cancelSpeech, setCurrentIndex, resetRetryAttempts]);

  // Core function to play the current word
  const playCurrentWord = useCallback(() => {
    // Mark that we've had user interaction
    userInteractionRef.current = true;
    
    // Basic checks
    if (!currentWord) {
      console.log('No current word to play');
      return;
    }
    
    if (muted) {
      console.log('Speech is muted');
      return;
    }
    
    if (paused) {
      console.log('Playback is paused');
      return;
    }
    
    console.log(`Attempting to play word with voice: ${selectedVoice.label}`);
    
    // CRITICAL: Cancel any ongoing speech to prevent queuing
    cancelSpeech();
    
    // Ensure speech synthesis is available
    if (!checkSpeechSupport()) return;
    
    // Small delay to ensure cancellation completes
    setTimeout(() => {
      try {
        // Reload voices (critical step)
        const voices = window.speechSynthesis.getVoices();
        console.log(`Voices loaded: ${voices.length} voices available`);
        
        // Create a fresh utterance for this word
        const utterance = new SpeechSynthesisUtterance();
        utteranceRef.current = utterance;
        
        // Set up the text with proper structure
        const wordText = currentWord.word;
        const meaningText = currentWord.meaning || '';
        const exampleText = currentWord.example || '';
        
        utterance.text = `${wordText}. ${meaningText}. ${exampleText}`.trim();
        
        // Set language based on selected voice
        utterance.lang = selectedVoice.region === 'UK' ? 'en-GB' : 'en-US';
        
        // Find and apply the voice
        const voice = findVoice(selectedVoice.region);
        if (voice) {
          utterance.voice = voice;
        }
        
        // Set speech parameters for better clarity
        utterance.rate = 0.95; // Slightly slower
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Set up event handlers BEFORE calling speak()
        utterance.onstart = () => {
          console.log(`Speech started for: ${currentWord.word}`);
          speakingRef.current = true;
          setIsSpeaking(true);
        };
        
        utterance.onend = () => {
          console.log(`Speech ended successfully for: ${currentWord.word}`);
          speakingRef.current = false;
          setIsSpeaking(false);
          
          // Only auto-advance if not paused and not muted
          if (!paused && !muted) {
            console.log('Auto-advancing to next word');
            goToNextWord();
          }
        };
        
        utterance.onerror = (event) => {
          console.error(`Speech synthesis error:`, event);
          speakingRef.current = false;
          setIsSpeaking(false);
          
          // Handle retry logic
          if (incrementRetryAttempts()) {
            console.log(`Retry attempt in progress`);
            
            // Wait briefly then retry
            setTimeout(() => {
              if (!paused && !muted) {
                console.log('Retrying speech after error');
                playCurrentWord();
              }
            }, 300);
          } else {
            console.log(`Max retries reached, advancing to next word`);
            if (!paused && !muted) {
              // Move on after too many failures
              goToNextWord();
            }
          }
        };
        
        // Actually start speaking
        window.speechSynthesis.speak(utterance);
        console.log('Speaking with voice:', utterance.voice ? utterance.voice.name : 'default system voice');
        
        // Verify speech is working after a short delay
        setTimeout(() => {
          if (!window.speechSynthesis.speaking && !paused && !muted) {
            console.warn("Speech synthesis not speaking after 100ms");
            
            // If we haven't exceeded retry attempts, try again
            if (incrementRetryAttempts()) {
              console.log(`Silent failure detected, retrying`);
              playCurrentWord();
            } else {
              // If we've tried enough times, move on
              console.log("Moving to next word after silent failures");
              goToNextWord();
            }
          }
        }, 100);
        
      } catch (error) {
        console.error('Error in speech playback:', error);
        setIsSpeaking(false);
        // Still try to advance to prevent getting stuck
        if (!paused && !muted) {
          setTimeout(() => goToNextWord(), 1000);
        }
      }
    }, 50); // Small delay to ensure cancellation completes
  }, [
    currentWord, 
    muted, 
    paused, 
    cancelSpeech, 
    findVoice, 
    goToNextWord, 
    selectedVoice,
    userInteractionRef,
    setIsSpeaking,
    speakingRef,
    incrementRetryAttempts,
    checkSpeechSupport
  ]);
  
  return {
    utteranceRef,
    currentWord,
    playCurrentWord,
    goToNextWord
  };
};
