
import { useCallback, useRef, useState, useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '../useVoiceSelection';
import { toast } from 'sonner';

/**
 * Hook for managing word playback functionality
 */
export const useWordPlayback = (
  wordList: VocabularyWord[],
  currentIndex: number,
  setCurrentIndex: (index: number | ((prevIndex: number) => number)) => void,
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
  
  // Reference to track if we're currently in a word transition
  const wordTransitionRef = useRef<boolean>(false);
  
  // Track if we've shown a permission error already
  const permissionErrorShownRef = useRef<boolean>(false);
  
  // Get the current word based on the index
  const currentWord = wordList.length > 0 ? wordList[currentIndex] : null;
  
  // Track permission state
  const [hasSpeechPermission, setHasSpeechPermission] = useState(true);
  
  // Function to advance to next word with full cleanup
  const goToNextWord = useCallback(() => {
    if (wordList.length === 0) return;
    
    // Set the transition flag to prevent multiple word changes
    wordTransitionRef.current = true;
    
    // Cancel any ongoing speech
    cancelSpeech();
    
    // Move to next word with a circular index
    setCurrentIndex((prevIndex: number) => {
      const nextIndex = (prevIndex + 1) % wordList.length;
      console.log(`Moving to word ${nextIndex}: ${wordList[nextIndex]?.word || 'unknown'}`);
      return nextIndex;
    });
    
    // Reset retry attempts for the new word
    resetRetryAttempts();
    
    // Clear the transition flag after a short delay
    setTimeout(() => {
      wordTransitionRef.current = false;
    }, 300);
  }, [wordList, cancelSpeech, setCurrentIndex, resetRetryAttempts]);

  // Core function to play the current word
  const playCurrentWord = useCallback(() => {
    // Don't try to play during word transitions
    if (wordTransitionRef.current) {
      console.log('Word transition in progress, delaying playback');
      return;
    }
    
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
    if (!checkSpeechSupport()) {
      if (!permissionErrorShownRef.current) {
        toast.error("Please click anywhere on the page to enable audio playback");
        permissionErrorShownRef.current = true;
      }
      return;
    }
    
    // Small delay to ensure cancellation completes
    setTimeout(() => {
      try {
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
          console.log(`Using voice: ${voice.name}`);
        } else {
          console.log('No matching voice found, using system default');
        }
        
        // Set speech parameters for better clarity
        utterance.rate = 0.9; // Slightly slower for better comprehension
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Set up event handlers BEFORE calling speak()
        utterance.onstart = () => {
          console.log(`Speech started for: ${currentWord.word}`);
          speakingRef.current = true;
          setIsSpeaking(true);
          setHasSpeechPermission(true);
          permissionErrorShownRef.current = false;
        };
        
        utterance.onend = () => {
          console.log(`Speech ended successfully for: ${currentWord.word}`);
          speakingRef.current = false;
          setIsSpeaking(false);
          
          // Only auto-advance if not paused and not muted
          if (!paused && !muted) {
            console.log('Auto-advancing to next word');
            setTimeout(() => goToNextWord(), 500);
          }
        };
        
        utterance.onerror = (event) => {
          console.error(`Speech synthesis error:`, event);
          speakingRef.current = false;
          setIsSpeaking(false);
          
          // Handle permission errors specially
          if (event.error === 'not-allowed') {
            setHasSpeechPermission(false);
            if (!permissionErrorShownRef.current) {
              toast.error("Please click anywhere on the page to enable audio playback");
              permissionErrorShownRef.current = true;
            }
            return;
          }
          
          // If error is "canceled" and we're in a word transition, don't retry
          if (event.error === 'canceled' && wordTransitionRef.current) {
            console.log('Speech canceled due to word transition, not retrying');
            return;
          }
          
          // Handle retry logic
          if (incrementRetryAttempts()) {
            console.log(`Retry attempt in progress`);
            
            // Wait briefly then retry
            setTimeout(() => {
              if (!paused && !muted && !wordTransitionRef.current) {
                console.log('Retrying speech after error');
                playCurrentWord();
              }
            }, 500);
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
          if (!window.speechSynthesis.speaking && !paused && !muted && !wordTransitionRef.current) {
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
    }, 100); // Small delay to ensure cancellation completes
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
    checkSpeechSupport,
    wordTransitionRef
  ]);
  
  // Try to play the current word when hasSpeechPermission changes to true
  useEffect(() => {
    if (hasSpeechPermission && currentWord && !muted && !paused && userInteractionRef.current) {
      console.log("Speech permission granted, attempting to play word");
      const timerId = setTimeout(() => playCurrentWord(), 500);
      return () => clearTimeout(timerId);
    }
  }, [hasSpeechPermission, currentWord, muted, paused, userInteractionRef, playCurrentWord]);
  
  return {
    utteranceRef,
    currentWord,
    playCurrentWord,
    goToNextWord,
    hasSpeechPermission
  };
};
