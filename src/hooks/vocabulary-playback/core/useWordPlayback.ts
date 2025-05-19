
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
  
  // Track if the user has interacted with the page
  useEffect(() => {
    // Add a click handler to the document to detect user interaction
    const handleUserInteraction = () => {
      if (!userInteractionRef.current) {
        console.log('User interaction detected, enabling audio playback');
        userInteractionRef.current = true;
        
        // Try to enable audio after user interaction
        setTimeout(() => {
          // Create and play a silent utterance to overcome permission issues
          try {
            const silentUtterance = new SpeechSynthesisUtterance(' ');
            silentUtterance.volume = 0;
            silentUtterance.onend = () => {
              console.log('Permission test succeeded');
              setHasSpeechPermission(true);
              
              // If we're not muted or paused, try to play the current word
              if (!muted && !paused && currentWord) {
                setTimeout(() => playCurrentWord(), 500);
              }
            };
            silentUtterance.onerror = (e) => {
              console.log('Permission test failed', e);
              // Still set permission to true to allow retries
              setHasSpeechPermission(true);
            };
            
            // Cancel any existing speech first
            window.speechSynthesis.cancel();
            
            // Wait a moment then try the test utterance
            setTimeout(() => {
              window.speechSynthesis.speak(silentUtterance);
            }, 300);
          } catch (err) {
            console.error('Error during permission test:', err);
          }
        }, 300);
      }
    };
    
    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    
    // Clean up
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [currentWord, muted, paused, userInteractionRef]);
  
  // Function to advance to next word with full cleanup
  const goToNextWord = useCallback(() => {
    if (wordList.length === 0) return;
    
    // Set the transition flag to prevent multiple word changes
    wordTransitionRef.current = true;
    
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
    
    // Force user interaction check
    if (!userInteractionRef.current) {
      toast.error("Please click anywhere on the page to enable audio");
      userInteractionRef.current = true; // Set this anyway to avoid repeating messages
      return;
    }
    
    // Ensure speech synthesis is available
    if (!checkSpeechSupport()) {
      if (!permissionErrorShownRef.current) {
        toast.error("Your browser doesn't support speech synthesis");
        permissionErrorShownRef.current = true;
      }
      return;
    }
    
    // Add a small delay before playing to ensure cancellation has completed
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
        utterance.rate = 0.95; // Slightly slower for better comprehension
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
          
          // Check if we're already in a word transition - if so, don't retry
          if (wordTransitionRef.current) {
            console.log('Error occurred during word transition, not retrying');
            speakingRef.current = false;
            setIsSpeaking(false);
            return;
          }
          
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
          
          // If error is "canceled" but it was intentional (during muting/pausing), don't retry
          if (event.error === 'canceled' && (muted || paused)) {
            console.log('Speech canceled due to muting or pausing, not retrying');
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
        
        // Attempt to wait for any potential race conditions to resolve
        setTimeout(() => {
          // Cancel any existing speech just before speaking
          window.speechSynthesis.cancel();
          
          // Actually start speaking
          window.speechSynthesis.speak(utterance);
          console.log('Speaking with voice:', utterance.voice ? utterance.voice.name : 'default system voice');
          
          // Verify speech is working after a short delay
          setTimeout(() => {
            if (!window.speechSynthesis.speaking && !paused && !muted && !wordTransitionRef.current) {
              console.warn("Speech synthesis not speaking after 200ms - potential silent failure");
              
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
          }, 200);  // Increased from 100ms to 200ms for better detection
        }, 150);  // Added delay before speaking to reduce race conditions
        
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
