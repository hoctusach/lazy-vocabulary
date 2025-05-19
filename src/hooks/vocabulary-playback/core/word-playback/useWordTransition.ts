
import { useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

/**
 * Hook for managing transitions between words
 */
export const useWordTransition = (
  wordList: VocabularyWord[],
  cancelSpeech: () => void,
  setCurrentIndex: (index: number | ((prevIndex: number) => number)) => void,
  resetRetryAttempts: () => void
) => {
  // Reference to track if we're currently in a word transition
  const wordTransitionRef = useRef<boolean>(false);
  
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

  return {
    wordTransitionRef,
    goToNextWord
  };
};
