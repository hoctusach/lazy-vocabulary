
import { useEffect, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { speak, stopSpeaking } from '@/utils/speech';

export const useAudioPlayback = (
  currentWord: VocabularyWord | null,
  isPaused: boolean,
  mute: boolean,
  voiceRegion: 'US' | 'UK',
  handleManualNext: () => void,
  isSoundPlaying: boolean,
  setIsSoundPlaying: (playing: boolean) => void,
  clearAutoAdvanceTimer: () => void,
  autoAdvanceTimerRef: React.MutableRefObject<number | null>,
  lastSpokenWordRef: React.MutableRefObject<string | null>,
  wordChangeProcessingRef: React.MutableRefObject<boolean>,
  speechAttemptsRef: React.MutableRefObject<number>,
  stopSpeaking: () => void,
  displayTime: number,
  pauseRequestedRef?: React.MutableRefObject<boolean>
) => {
  // Clear function to ensure we always clean up properly
  const clearAllAudioState = useCallback(() => {
    clearAutoAdvanceTimer();
    stopSpeaking();
    setIsSoundPlaying(false);
  }, [clearAutoAdvanceTimer, stopSpeaking, setIsSoundPlaying]);

  // Set up document-level interaction handler for speech permissions
  useEffect(() => {
    const documentClickHandler = () => {
      // This empty handler helps enable speech in browsers that require user gesture
      if (window.speechSynthesis && !speechSynthesis.speaking && currentWord) {
        try {
          // Just create a silent utterance to "unlock" speech
          const silentUtterance = new SpeechSynthesisUtterance('');
          silentUtterance.volume = 0;
          window.speechSynthesis.speak(silentUtterance);
        } catch (error) {
          // Ignore errors here, just trying to enable speech
        }
      }
    };

    // Add the event listener to the document
    document.addEventListener('click', documentClickHandler);
    
    // Clean up
    return () => {
      document.removeEventListener('click', documentClickHandler);
      clearAllAudioState();
    };
  }, [clearAllAudioState]);

  // Handle playing audio when the current word changes - with debouncing
  useEffect(() => {
    if (!currentWord) {
      console.log('[APP] No current word, nothing to speak');
      return;
    }
    
    // Skip playback when muted or paused
    if (isPaused) {
      console.log('[APP] App is paused, not speaking');
      return;
    }
    
    // Debounce rapid word changes
    if (wordChangeProcessingRef.current) {
      console.log('[APP] Word change in progress, delaying');
      return;
    }
    
    // Check if we're already speaking this word
    if (lastSpokenWordRef.current === currentWord.word && isSoundPlaying) {
      console.log('[APP] Already speaking this word, skipping:', currentWord.word);
      return;
    }
    
    // Set processing flag to prevent overlaps
    wordChangeProcessingRef.current = true;
    speechAttemptsRef.current = 0;
    
    // Clear any existing timers to prevent overlapping
    clearAutoAdvanceTimer();
    
    // Save this word as the last one we processed
    lastSpokenWordRef.current = currentWord.word;
    
    // Record speech start time for debugging
    const startTime = Date.now();
    console.log(`[APP] Starting speech for ${currentWord.word} at ${new Date().toISOString()}`);
    
    // Small delay before speaking to ensure clean state
    const speechDelayTimeout = setTimeout(() => {
      const playWordAudio = async () => {
        try {
          // Only set playing state if not muted
          if (!mute) {
            setIsSoundPlaying(true);
          }
          
          // First, ensure previous speech is stopped
          stopSpeaking();
          
          // Don't actually speak if muted
          if (mute) {
            console.log('[APP] Muted, not speaking audio');
            wordChangeProcessingRef.current = false;
            return;
          }
          
          console.log('[APP] ⚡ Speaking word:', currentWord.word);
          
          // Create the text to speak with periods to create natural pauses
          const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}.`;
          
          try {
            // Speak the text and wait for completion
            await speak(fullText, voiceRegion, pauseRequestedRef);
            
            console.log('[APP] ✅ Speech completed for:', currentWord.word);
            
            // Only auto-advance if not paused or muted
            if (!isPaused && !mute && !(pauseRequestedRef?.current)) {
              // Clear any existing timer first
              clearAutoAdvanceTimer();
              
              // Set auto-advance timer only after speech finishes
              const speechDuration = Date.now() - startTime;
              const pauseBeforeNextWord = Math.max(1500, Math.min(2500, speechDuration * 0.3));
              
              console.log(`[APP] Setting auto-advance timer for ${pauseBeforeNextWord}ms`);
              autoAdvanceTimerRef.current = window.setTimeout(() => {
                // Final check before advancing to prevent race conditions
                if (!isPaused && !mute && !(pauseRequestedRef?.current)) {
                  handleManualNext();
                } else {
                  console.log('[APP] Auto-advance canceled due to state change');
                }
              }, pauseBeforeNextWord);
            }
          } catch (error) {
            console.error("[APP] Error in speech:", error);
            // Reset processing state to allow retry
            wordChangeProcessingRef.current = false;
            // Don't attempt to auto-advance on error
          }
        } finally {
          // Always reset the sound playing state
          setIsSoundPlaying(false);
          // Allow processing new words again
          wordChangeProcessingRef.current = false;
        }
      };
      
      // Start audio playback
      playWordAudio();
    }, 150); // Short delay to ensure state is ready
    
    // Cleanup function
    return () => {
      clearTimeout(speechDelayTimeout);
    };
  }, [
    currentWord, 
    isPaused,
    mute, // Use mute instead of isMuted for better synchronization
    voiceRegion,
    clearAutoAdvanceTimer,
    stopSpeaking,
    setIsSoundPlaying,
    autoAdvanceTimerRef,
    lastSpokenWordRef,
    wordChangeProcessingRef,
    speechAttemptsRef,
    handleManualNext,
    pauseRequestedRef,
    isSoundPlaying,
    clearAllAudioState
  ]);
  
  // Effect to handle pause/unpause behavior
  useEffect(() => {
    if (isPaused) {
      console.log('[APP] Paused, stopping ongoing speech');
      stopSpeaking();
      clearAutoAdvanceTimer();
      setIsSoundPlaying(false);
      
      if (pauseRequestedRef) {
        pauseRequestedRef.current = true;
      }
    } else if (currentWord && !mute && lastSpokenWordRef.current !== currentWord.word) {
      // When unpausing, if we have a current word and it hasn't been spoken, speak it
      console.log('[APP] Unpaused with new word, will speak:', currentWord.word);
      
      if (pauseRequestedRef) {
        pauseRequestedRef.current = false;
      }
      
      // Reset speech state
      wordChangeProcessingRef.current = false;
      lastSpokenWordRef.current = null; // Force re-speak by clearing last spoken word
      
      // Small delay to ensure clean state
      setTimeout(() => {
        // Force a re-render to trigger the speech effect
        setIsSoundPlaying(false);
        setTimeout(() => {
          if (!isPaused && !mute) {
            setIsSoundPlaying(true);
          }
        }, 50);
      }, 200);
    }
  }, [isPaused, mute, currentWord, stopSpeaking, clearAutoAdvanceTimer, setIsSoundPlaying, pauseRequestedRef, wordChangeProcessingRef, lastSpokenWordRef]);
  
  // Effect specifically for mute changes
  useEffect(() => {
    // Store mute state in localStorage
    try {
      const buttonStates = JSON.parse(localStorage.getItem('buttonStates') || '{}');
      buttonStates.isMuted = mute;
      localStorage.setItem('buttonStates', JSON.stringify(buttonStates));
    } catch (e) {
      // Ignore localStorage errors
    }
    
    // When unmuting, don't automatically start speech again
    // Just update the mute state and let the regular playback flow continue
    
    // When muting, stop any ongoing speech
    if (mute) {
      stopSpeaking();
      setIsSoundPlaying(false);
    }
  }, [mute, stopSpeaking, setIsSoundPlaying]);
};
