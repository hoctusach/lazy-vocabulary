
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
  displayTime: number
) => {
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
          // Fix: Pass a boolean value directly instead of a function
          setIsSoundPlaying(!isSoundPlaying); // Toggle to force re-render
        }
      }, 300);
      return () => clearTimeout(retryTimeout);
    }
    
    // Flag to track that we're processing a word
    wordChangeProcessingRef.current = true;
    speechAttemptsRef.current += 1;
    console.log(`[APP] Word change detected, attempt #${speechAttemptsRef.current} for: ${currentWord.word}`);
    
    // Clear any existing timers
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
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('[APP] ⚡ Starting to speak word:', currentWord.word);
        
        // Create the text to speak with periods to create natural pauses
        const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}.`;
        
        // Use the direct speak function from utils/speech for more reliability
        await speak(fullText, voiceRegion);
        
        console.log('[APP] ✅ Speech completed for:', currentWord.word);
        
        // After speech completes, set timer for next word if not paused or muted
        if (!isPaused && !mute) {
          console.log('[APP] Setting timer for next word');
          autoAdvanceTimerRef.current = window.setTimeout(() => {
            if (!isPaused) {
              console.log('[APP] Auto-advancing to next word');
              handleManualNext();
            }
          }, 2000); // Wait 2 seconds after audio finishes before advancing
        }
      } catch (error) {
        console.error("[APP] Error playing audio:", error);
      } finally {
        setIsSoundPlaying(false);
        // Allow processing new words again
        wordChangeProcessingRef.current = false;
        console.log('[APP] Word processing completed for:', currentWord.word);
      }
    };

    // Start the audio playback with a shorter delay to ensure DOM rendering is complete
    console.log(`[APP] Scheduling speech for ${currentWord.word}`); 
    const speechTimerRef = setTimeout(playWordAudio, 100); 
    
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
    voiceRegion, 
    handleManualNext, 
    clearAutoAdvanceTimer, 
    stopSpeaking, 
    displayTime, 
    setIsSoundPlaying,
    autoAdvanceTimerRef,
    lastSpokenWordRef,
    wordChangeProcessingRef,
    speechAttemptsRef,
    isSoundPlaying // Added isSoundPlaying as a dependency since we're using it now
  ]);
};
