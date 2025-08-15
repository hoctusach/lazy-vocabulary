
import * as React from 'react';
import { useRef, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

export const useWordTransition = (
  wordList: VocabularyWord[],
  cancelSpeech: () => void,
  setCurrentIndex: (index: number | ((prevIndex: number) => number)) => void,
  resetRetryAttempts: () => void,
  lastManualActionTimeRef: React.MutableRefObject<number>,
  autoAdvanceTimerRef: React.MutableRefObject<number | null>
) => {
  const wordTransitionRef = useRef(false);

  const goToNextWord = useCallback((fromUser = false) => {
    if (wordTransitionRef.current) return;
    
    wordTransitionRef.current = true;
    
    if (fromUser) {
      lastManualActionTimeRef.current = Date.now();
    }
    
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    
    cancelSpeech();
    resetRetryAttempts();
    
    setCurrentIndex(prevIndex => {
      const nextIndex = (prevIndex + 1) % wordList.length;
      setTimeout(() => {
        wordTransitionRef.current = false;
      }, 100);
      return nextIndex;
    });
  }, [wordList.length, cancelSpeech, setCurrentIndex, resetRetryAttempts, lastManualActionTimeRef, autoAdvanceTimerRef]);

  const scheduleAutoAdvance = useCallback((delay: number) => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      goToNextWord();
    }, delay);
  }, [goToNextWord]);

  return { wordTransitionRef, goToNextWord, scheduleAutoAdvance };
};
