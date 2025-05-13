
import { useState, useCallback, useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

export const useWordNavigation = (
  wordList: VocabularyWord[], 
  cancelSpeech: () => void,
  muted: boolean,
  paused: boolean,
  playWord: (word: VocabularyWord) => void
) => {
  // Navigation state
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Find the current word based on the index - this is the single source of truth
  const currentWord = wordList.length > 0 ? wordList[currentIndex] : null;
  
  // Debug logs to track sync
  useEffect(() => {
    if (currentWord) {
      console.log(`Current index: ${currentIndex}, Current word: ${currentWord.word}`);
    }
  }, [currentIndex, currentWord]);
  
  // Function to advance to the next word
  const advanceToNext = useCallback(() => {
    // Cancel any ongoing speech
    cancelSpeech();
    
    // Move to the next word, wrapping around if needed
    setCurrentIndex(prevIndex => {
      const nextIndex = (prevIndex + 1) % wordList.length;
      
      // If not muted or paused, play the next word
      if (!muted && !paused && wordList[nextIndex]) {
        // Small timeout to ensure state update has propagated
        setTimeout(() => playWord(wordList[nextIndex]), 50);
      }
      
      return nextIndex;
    });
  }, [wordList, cancelSpeech, muted, paused, playWord]);
  
  return {
    currentIndex,
    currentWord,
    setCurrentIndex,
    advanceToNext
  };
};
