
import { useCallback, useRef } from 'react';
import { vocabularyService } from '@/services/vocabularyService';
import { stopSpeaking } from '@/utils/speech';
import { calculateSpeechDuration } from '@/utils/speech';

export const useWordNavigation = (
  isPaused: boolean,
  setCurrentWord: (word: any) => void,
  lastManualActionTimeRef: React.MutableRefObject<number>,
  wordChangeInProgressRef: React.MutableRefObject<boolean>,
  clearTimer: () => void
) => {
  const timerRef = useRef<number | null>(null);

  const displayNextWord = useCallback(async () => {
    // Prevent multiple word changes at once
    if (wordChangeInProgressRef.current) {
      console.log("Word change already in progress, ignoring request");
      return;
    }
    
    // Don't process if paused
    if (isPaused) {
      console.log("App is paused, not displaying next word");
      return;
    }
    
    // Check if there was a recent manual action
    const now = Date.now();
    const timeSinceLastManualAction = now - lastManualActionTimeRef.current;
    if (timeSinceLastManualAction < 1500) {
      console.log("Recent manual action detected, delaying auto word change");
      clearTimer();
      timerRef.current = window.setTimeout(displayNextWord, 1500);
      return;
    }
    
    // Set changing word state to prevent conflicts
    wordChangeInProgressRef.current = true;
    clearTimer();
    stopSpeaking();
    
    // Double-check pause state again
    if (isPaused) {
      wordChangeInProgressRef.current = false;
      return;
    }
    
    try {
      const nextWord = vocabularyService.getNextWord();
      
      if (nextWord) {
        console.log("Displaying next word:", nextWord.word);
        setCurrentWord(nextWord);
        
        // Calculate total duration for word and add buffer time
        const fullText = `${nextWord.word}. ${nextWord.meaning}. ${nextWord.example}`;
        const duration = calculateSpeechDuration(fullText);
        
        // Schedule next word if not paused
        if (!isPaused) {
          clearTimer();
          timerRef.current = window.setTimeout(displayNextWord, duration + 2000);
        }
      }
    } finally {
      setTimeout(() => {
        wordChangeInProgressRef.current = false;
      }, 800);
    }
  }, [isPaused, clearTimer, setCurrentWord, lastManualActionTimeRef, wordChangeInProgressRef]);

  return {
    displayNextWord,
    timerRef
  };
};
