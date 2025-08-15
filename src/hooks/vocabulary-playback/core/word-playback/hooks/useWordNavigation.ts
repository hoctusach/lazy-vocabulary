
import * as React from 'react';
import { VocabularyWord } from '@/types/vocabulary';

export const useWordNavigation = (
  wordList: VocabularyWord[],
  cancelSpeech: () => void,
  setCurrentIndex: (index: number | ((prevIndex: number) => number)) => void,
  resetRetryAttempts: () => void,
  lastManualActionTimeRef: React.MutableRefObject<number>,
  autoAdvanceTimerRef: React.MutableRefObject<number | null>
) => {
  const goToNextWord = (fromUser = false) => {
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
      return nextIndex;
    });
  };

  return { goToNextWord };
};
