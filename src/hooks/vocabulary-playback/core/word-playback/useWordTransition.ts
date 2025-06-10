
import { useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

/**
 * Hook for managing transitions between words
 */
export const useWordTransition = (
  wordList: VocabularyWord[],
  cancelSpeech: () => void,
  setCurrentIndex: (index: number | ((prevIndex: number) => number)) => void,
  resetRetryAttempts: () => void,
  lastManualActionTimeRef: React.MutableRefObject<number>,
  autoAdvanceTimerRef: React.MutableRefObject<number | null>
) => {
  // Reference to track if we're currently in a word transition
  const wordTransitionRef = useRef<boolean>(false);
  
  // Function to advance to next word with full cleanup
  const goToNextWord = useCallback((fromUser: boolean = false) => {
    if (fromUser) {
      lastManualActionTimeRef.current = Date.now();
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    }
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
  }, [wordList, cancelSpeech, setCurrentIndex, resetRetryAttempts, lastManualActionTimeRef, autoAdvanceTimerRef]);

  const scheduleAutoAdvance = useCallback((delay: number) => {
    const timeSinceManual = Date.now() - lastManualActionTimeRef.current;
    if (timeSinceManual < 1000) {
      console.log('Skipping auto-advance due to recent manual action');
      return;
    }
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      autoAdvanceTimerRef.current = null;
      goToNextWord();
    }, delay);
  }, [goToNextWord, lastManualActionTimeRef, autoAdvanceTimerRef]);

  return {
    wordTransitionRef,
    goToNextWord,
    scheduleAutoAdvance
  };
};
