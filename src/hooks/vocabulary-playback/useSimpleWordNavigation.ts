
import { useState, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

/**
 * Simplified word navigation hook for simple vocabulary playback
 */
export const useSimpleWordNavigation = (wordList: VocabularyWord[]) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Get current word based on index
  const currentWord = wordList.length > 0 ? wordList[currentIndex] : null;
  
  // Function to advance to next word
  const advanceToNext = useCallback(() => {
    setCurrentIndex(prevIndex => {
      const nextIndex = (prevIndex + 1) % wordList.length;
      console.log(`[SIMPLE-WORD-NAV] Advancing from ${prevIndex} to ${nextIndex}`);
      return nextIndex;
    });
  }, [wordList.length]);

  // Function to go to previous word
  const goToPrevious = useCallback(() => {
    setCurrentIndex(prevIndex => {
      const prevWordIndex = prevIndex > 0 ? prevIndex - 1 : wordList.length - 1;
      console.log(`[SIMPLE-WORD-NAV] Going to previous word at index: ${prevWordIndex}`);
      return prevWordIndex;
    });
  }, [wordList.length]);

  // Function to go to specific word
  const goToWord = useCallback((index: number) => {
    if (index >= 0 && index < wordList.length) {
      console.log(`[SIMPLE-WORD-NAV] Going to word at index: ${index}`);
      setCurrentIndex(index);
    }
  }, [wordList.length]);

  return {
    currentIndex,
    currentWord,
    advanceToNext,
    goToPrevious,
    goToWord
  };
};
