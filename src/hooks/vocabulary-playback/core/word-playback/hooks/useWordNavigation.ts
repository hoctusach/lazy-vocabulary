
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { wordSelectionService } from '@/services/vocabulary/WordSelectionService';

export const useWordNavigation = (
  wordList: VocabularyWord[],
  currentIndex: number,
  setCurrentIndex: (index: number | ((prevIndex: number) => number)) => void,
  cancelSpeech: () => void,
  resetRetryAttempts: () => void,
  lastManualActionTimeRef: React.MutableRefObject<number>,
  autoAdvanceTimerRef: React.MutableRefObject<number | null>
) => {
  const goToNextWord = useCallback((fromUser: boolean = false) => {
    console.log('[WORD-NAVIGATION] Going to next word, fromUser:', fromUser);
    
    // Clear any existing auto-advance timer
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    // Cancel any ongoing speech
    cancelSpeech();
    resetRetryAttempts();

    if (fromUser) {
      lastManualActionTimeRef.current = Date.now();
    }

    // Mark current word as shown if it exists
    if (wordList[currentIndex]) {
      wordSelectionService.markWordAsShown(wordList[currentIndex]);
    }

    // Sync word list and clean up old entries
    wordSelectionService.syncWithWordList(wordList);

    // Select next word using frequency-based selection
    try {
      const { index: nextIndex } = wordSelectionService.selectNextWord(
        wordList, 
        currentIndex, 
        fromUser
      );
      
      console.log('[WORD-NAVIGATION] Selected next word index:', nextIndex);
      setCurrentIndex(nextIndex);
    } catch (error) {
      console.error('[WORD-NAVIGATION] Error selecting next word:', error);
      // Fallback to simple sequential selection
      const nextIndex = (currentIndex + 1) % wordList.length;
      setCurrentIndex(nextIndex);
    }
  }, [
    wordList, 
    currentIndex, 
    setCurrentIndex, 
    cancelSpeech, 
    resetRetryAttempts,
    lastManualActionTimeRef,
    autoAdvanceTimerRef
  ]);

  const scheduleAutoAdvance = useCallback((delay: number) => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }

    autoAdvanceTimerRef.current = window.setTimeout(() => {
      // Check if this is still a valid auto-advance (not overridden by manual action)
      const timeSinceManualAction = Date.now() - lastManualActionTimeRef.current;
      if (timeSinceManualAction > delay) {
        console.log('[WORD-NAVIGATION] Auto-advancing after delay:', delay);
        goToNextWord(false); // Auto-advance, not user-triggered
      }
    }, delay);
  }, [goToNextWord, lastManualActionTimeRef, autoAdvanceTimerRef]);

  return {
    goToNextWord,
    scheduleAutoAdvance
  };
};
