
import { useState, useCallback, useEffect, useRef } from 'react';
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
  const userInteractionRef = useRef(false);
  
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
    // Mark that we've had user interaction
    userInteractionRef.current = true;
    
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
  
  // Initial playback effect - now only plays if we've had user interaction
  useEffect(() => {
    if (currentWord && wordList.length > 0 && !muted && !paused && userInteractionRef.current) {
      // Only auto-play if we've had at least one user interaction
      console.log(`Auto-playing current word after user interaction: ${currentWord.word}`);
      playWord(currentWord);
    }
  }, [currentWord, wordList.length, muted, paused, playWord, userInteractionRef.current]);
  
  return {
    currentIndex,
    currentWord,
    setCurrentIndex,
    advanceToNext,
    // Export this to track if we've had user interaction
    userInteractionRef
  };
};
