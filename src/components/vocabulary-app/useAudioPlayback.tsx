
import { useEffect, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { speak } from '@/utils/speech';

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
    };
  }, []);

  // Handle playing audio when the current word changes
  useEffect(() => {
    if (!currentWord || mute || isPaused) {
      console.log('[APP] Skipping speech: ' + 
        (!currentWord ? 'no word' : '') + 
        (mute ? ', muted' : '') + 
        (isPaused ? ', paused' : ''));
      return;
    }
    
    // Check if we're already speaking this word
    if (lastSpokenWordRef.current === currentWord.word) {
      console.log('[APP] Already spoke this word, skipping:', currentWord.word);
      return;
    }
    
    // Set processing flag to prevent overlaps
    if (wordChangeProcessingRef.current) {
      console.log('[APP] Still processing previous word, will retry shortly');
      // Instead of skipping, retry after a short delay
      const retryTimeout = setTimeout(() => {
        if (currentWord && !mute && !isPaused) {
          console.log('[APP] Retrying speech for:', currentWord.word);
          wordChangeProcessingRef.current = false;
          speechAttemptsRef.current += 1;
          setIsSoundPlaying(false);
          setTimeout(() => setIsSoundPlaying(true), 10); // Toggle to force re-render
        }
      }, 300);
      return () => clearTimeout(retryTimeout);
    }
    
    // Flag to track that we're processing a word
    wordChangeProcessingRef.current = true;
    speechAttemptsRef.current += 1;
    console.log(`[APP] Word change detected, attempt #${speechAttemptsRef.current} for: ${currentWord.word}`);
    
    // Clear any existing timers to prevent overlapping
    clearAutoAdvanceTimer();
    
    // Save this word as the last one we processed
    lastSpokenWordRef.current = currentWord.word;
    
    // Give the DOM time to update with new word
    const playWordAudio = async () => {
      try {
        // Set flag to show audio is playing
        setIsSoundPlaying(true);
        
        // First, ensure previous speech is stopped
        stopSpeaking();
        console.log('[APP] Previous speech stopped, preparing to speak:', currentWord.word);
        
        // Small delay to ensure system is ready
        await new Promise(resolve => setTimeout(resolve, 150));
        
        console.log('[APP] ⚡ Starting to speak word:', currentWord.word);
        
        // Create the text to speak with periods to create natural pauses
        const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}.`;
        
        try {
          // Use the direct speak function from utils/speech, passing the correct voice region
          // This is essential for the accent selector to work properly
          await speak(fullText, voiceRegion, pauseRequestedRef);
          
          console.log('[APP] ✅ Speech completed for:', currentWord.word);
          
          // After speech completes, set timer for next word if not paused or muted
          // Only advance if not paused (checking pauseRequestedRef too)
          if (!isPaused && !mute && !(pauseRequestedRef?.current)) {
            console.log('[APP] Setting timer for next word');
            
            // Clear any existing timer first to prevent multiple firings
            if (autoAdvanceTimerRef.current !== null) {
              clearTimeout(autoAdvanceTimerRef.current);
              autoAdvanceTimerRef.current = null;
            }
            
            // Set new timer for advancing
            autoAdvanceTimerRef.current = window.setTimeout(() => {
              // Double check pause state before advancing
              if (!isPaused && !(pauseRequestedRef?.current)) {
                console.log('[APP] Auto-advancing to next word');
                // Ensure we stop any speech first
                stopSpeaking();
                // Brief delay before advancing to ensure clean state
                setTimeout(() => {
                  // Final check to prevent race conditions
                  if (!isPaused && !(pauseRequestedRef?.current)) {
                    handleManualNext();
                  } else {
                    console.log('[APP] Auto-advance canceled due to pause state change');
                  }
                }, 50);
              } else {
                console.log('[APP] Auto-advance skipped due to pause state');
              }
            }, 2500); // Wait 2.5 seconds after audio finishes before advancing
          } else {
            console.log('[APP] Not advancing - paused:', isPaused, 'muted:', mute, 'pauseRequested:', pauseRequestedRef?.current);
          }
        } catch (error) {
          console.error("[APP] Error playing audio:", error);
          // Even if speech fails, we should still allow navigation
          // Don't block the UI or throw errors that would prevent user from continuing
        }
      } finally {
        setIsSoundPlaying(false);
        // Allow processing new words again
        wordChangeProcessingRef.current = false;
        console.log('[APP] Word processing completed for:', currentWord.word);
      }
    };

    // Start the audio playback with a slightly longer delay to ensure DOM rendering is complete
    console.log(`[APP] Scheduling speech for ${currentWord.word}`); 
    const speechTimerRef = setTimeout(playWordAudio, 150); 
    
    // Cleanup function
    return () => {
      clearTimeout(speechTimerRef);
      clearAutoAdvanceTimer();
      stopSpeaking();
    };
  }, [
    currentWord, 
    mute, 
    isPaused, 
    voiceRegion, // Now properly tracked for voice changes
    handleManualNext, 
    clearAutoAdvanceTimer, 
    stopSpeaking, 
    displayTime, 
    setIsSoundPlaying,
    autoAdvanceTimerRef,
    lastSpokenWordRef,
    wordChangeProcessingRef,
    speechAttemptsRef,
    isSoundPlaying,
    pauseRequestedRef
  ]);
  
  // Effect to handle pause state changes
  useEffect(() => {
    if (isPaused) {
      // If paused, update our pauseRequested flag
      if (pauseRequestedRef) {
        pauseRequestedRef.current = true;
        console.log('[APP] Pause requested - will complete current word but not advance');
      }
      
      // Clear any existing auto-advance timer
      clearAutoAdvanceTimer();
    } else {
      // If unpaused, clear the flag to allow speech to continue
      if (pauseRequestedRef) {
        pauseRequestedRef.current = false;
        console.log('[APP] Pause cleared - speech will continue with next word');
        
        // If we have a current word, try to resume speaking
        if (currentWord && !mute) {
          // If we're unpausing, try to continue with the current word
          if (lastSpokenWordRef.current === currentWord.word && !wordChangeProcessingRef.current) {
            console.log('[APP] Resuming speech after unpause');
            wordChangeProcessingRef.current = false;
            speechAttemptsRef.current = 0;
            // Force a re-trigger of the speech
            lastSpokenWordRef.current = null;
            // Small delay to ensure clean state
            setTimeout(() => {
              setIsSoundPlaying(true);
            }, 150);
          }
        }
      }
    }
  }, [isPaused, pauseRequestedRef, currentWord, mute, lastSpokenWordRef, wordChangeProcessingRef, speechAttemptsRef, setIsSoundPlaying, clearAutoAdvanceTimer]);
};
