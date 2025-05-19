
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
  
  // Track if voices have been loaded
  const voicesLoadedRef = useRef<boolean>(false);
  
  // Ensure voices are loaded before attempting speech
  const ensureVoicesLoaded = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      // If voices are already loaded, resolve immediately
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        voicesLoadedRef.current = true;
        console.log(`Voices already loaded: ${voices.length} voices available`);
        resolve(true);
        return;
      }
      
      // Set up event listener for voices changed
      const voiceChangedHandler = () => {
        const newVoices = window.speechSynthesis.getVoices();
        if (newVoices.length > 0) {
          console.log(`Voices loaded via event: ${newVoices.length} voices`);
          voicesLoadedRef.current = true;
          window.speechSynthesis.removeEventListener('voiceschanged', voiceChangedHandler);
          resolve(true);
        }
      };
      
      // Listen for voices changed event
      window.speechSynthesis.addEventListener('voiceschanged', voiceChangedHandler);
      
      // Fallback timeout - try to get voices directly after a delay
      setTimeout(() => {
        const fallbackVoices = window.speechSynthesis.getVoices();
        if (fallbackVoices.length > 0 && !voicesLoadedRef.current) {
          console.log(`Fallback voices loaded: ${fallbackVoices.length} voices`);
          voicesLoadedRef.current = true;
          window.speechSynthesis.removeEventListener('voiceschanged', voiceChangedHandler);
          resolve(true);
        } else if (!voicesLoadedRef.current) {
          console.warn('No voices available after timeout, continuing anyway');
          window.speechSynthesis.removeEventListener('voiceschanged', voiceChangedHandler);
          resolve(false);
        }
      }, 2000);
    });
  }, []);
  
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

  // Core function to play the current word - no longer gated by any "unmute" or "play" button
  const playCurrentWord = useCallback(async () => {
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
      console.log('Speech is muted, but continuing to show words');
      // We don't return here as we want to auto-advance even when muted
      setTimeout(() => goToNextWord(), 3000);
      return;
    }
    
    if (paused) {
      console.log('Playback is paused');
      return;
    }
    
    // CRITICAL: Ensure voices are loaded before attempting speech
    if (!voicesLoadedRef.current) {
      console.log('Ensuring voices are loaded before speaking');
      await ensureVoicesLoaded();
    }
    
    console.log(`Attempting to play word with voice: ${selectedVoice.label}`);
    
    // CRITICAL: Cancel any ongoing speech to prevent queuing
    cancelSpeech();
    
    // Ensure speech synthesis is available
    if (!checkSpeechSupport()) {
      if (!permissionErrorShownRef.current) {
        toast.error("Your browser doesn't support speech synthesis");
        permissionErrorShownRef.current = true;
      }
      // Auto-advance even if speech isn't supported
      setTimeout(() => goToNextWord(), 3000);
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
          
          // Auto-advance to next word after speech completes
          setTimeout(() => goToNextWord(), 500);
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
            // Continue to next word even without audio
            setTimeout(() => goToNextWord(), 2000);
            return;
          }
          
          // If error is "canceled" but it was intentional (during muting/pausing), don't retry
          if (event.error === 'canceled' && (muted || paused)) {
            console.log('Speech canceled due to muting or pausing, not retrying');
            // Still auto-advance after a short delay
            setTimeout(() => goToNextWord(), 2000);
            return;
          }
          
          // Handle retry logic
          if (incrementRetryAttempts()) {
            console.log(`Retry attempt in progress`);
            
            // Wait briefly then retry
            setTimeout(() => {
              if (!paused && !wordTransitionRef.current) {
                console.log('Retrying speech after error');
                playCurrentWord();
              }
            }, 500);
          } else {
            console.log(`Max retries reached, advancing to next word`);
            // Move on after too many failures
            setTimeout(() => goToNextWord(), 1000);
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
          }, 200);
        }, 150);
        
      } catch (error) {
        console.error('Error in speech playback:', error);
        setIsSpeaking(false);
        // Still try to advance to prevent getting stuck
        setTimeout(() => goToNextWord(), 1000);
      }
    }, 100);
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
    wordTransitionRef,
    ensureVoicesLoaded
  ]);
  
  // Auto-play on word change - no longer relying on user interaction flag
  useEffect(() => {
    if (currentWord) {
      console.log(`Auto-playing word after change: ${currentWord.word}`);
      const timerId = setTimeout(() => {
        playCurrentWord();
      }, 200);
      return () => clearTimeout(timerId);
    }
  }, [currentWord, playCurrentWord]);
  
  // Global user interaction detection - one-time setup for the entire app
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!userInteractionRef.current) {
        console.log('First user interaction detected - enabling speech');
        userInteractionRef.current = true;
        
        // Try to play a silent sound to initialize audio context
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          oscillator.frequency.value = 0; // Silent
          oscillator.connect(audioContext.destination);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.001);
        } catch (e) {
          console.warn('Could not initialize audio context:', e);
        }
        
        // Initialize speech synthesis with a silent utterance
        try {
          const initUtterance = new SpeechSynthesisUtterance(' '); // Just a space
          initUtterance.volume = 0.01; // Nearly silent
          initUtterance.onend = () => {
            console.log('Speech initialization successful');
            // Load voices and then attempt to speak the current word
            ensureVoicesLoaded().then(() => {
              if (currentWord) {
                playCurrentWord();
              }
            });
          };
          
          initUtterance.onerror = (e) => {
            console.error('Speech initialization error:', e);
            // Try to play current word anyway after a moment
            setTimeout(() => {
              if (currentWord) {
                playCurrentWord();
              }
            }, 500);
          };
          
          // Speak the silent utterance to initialize the speech system
          window.speechSynthesis.cancel(); // Clear any pending speech
          window.speechSynthesis.speak(initUtterance);
        } catch (e) {
          console.error('Error initializing speech:', e);
        }
        
        // Remove event listeners after first interaction
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      }
    };
    
    // Add event listeners for various user interaction types
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    // Check for previous interactions
    if (localStorage.getItem('hadUserInteraction') === 'true') {
      console.log('Previous user interaction detected from localStorage');
      userInteractionRef.current = true;
      handleUserInteraction();
    }
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [userInteractionRef, currentWord, playCurrentWord, ensureVoicesLoaded]);
  
  // When user interacts, save that fact to localStorage
  useEffect(() => {
    if (userInteractionRef.current) {
      localStorage.setItem('hadUserInteraction', 'true');
    }
  }, [userInteractionRef.current]);
  
  return {
    utteranceRef,
    currentWord,
    playCurrentWord,
    goToNextWord,
    hasSpeechPermission
  };
};
