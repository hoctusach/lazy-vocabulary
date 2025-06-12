
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

/**
 * Word navigation functionality
 */
export const useWordNavigation = (
  wordList: VocabularyWord[],
  currentIndex: number,
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>,
  currentWord: VocabularyWord | null,
  isTransitioningRef: React.MutableRefObject<boolean>,
  lastWordChangeRef: React.MutableRefObject<number>,
  clearAutoAdvanceTimer: () => void
) => {
  // Go to next word with proper timer management
  const goToNext = useCallback(() => {
    if (isTransitioningRef.current || wordList.length === 0) {
      console.log('[WORD-NAVIGATION] Cannot go to next - transitioning or no words');
      return;
    }

    console.log('[WORD-NAVIGATION] Going to next word', {
      from: currentWord?.word,
      index: currentIndex,
      total: wordList.length
    });
    isTransitioningRef.current = true;
    lastWordChangeRef.current = Date.now();

    // CRITICAL: Clear auto-advance timer before any word transition
    clearAutoAdvanceTimer();

    // Stop current speech
    unifiedSpeechController.stop();

    // Move to next word
    setCurrentIndex(prevIndex => {
      const nextIndex = (prevIndex + 1) % wordList.length;
      console.log(`[WORD-NAVIGATION] Moving from word ${prevIndex} to ${nextIndex}`);
      return nextIndex;
    });

    // Clear transition flag after brief delay
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 100);
  }, [wordList.length, currentWord?.word, currentIndex, clearAutoAdvanceTimer, setCurrentIndex, isTransitioningRef, lastWordChangeRef]);

  return {
    goToNext
  };
};
