
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

/**
 * Word navigation logic
 * Fixed to work properly on mobile devices
 */
export const useWordNavigation = (
  wordList: VocabularyWord[],
  currentIndex: number,
  setCurrentIndex: (index: number) => void,
  currentWord: VocabularyWord | null,
  isTransitioningRef: React.MutableRefObject<boolean>,
  lastWordChangeRef: React.MutableRefObject<number>,
  clearAutoAdvanceTimer: () => void
) => {
  // Go to next word with proper mobile handling
  const goToNext = useCallback(() => {
    const now = Date.now();
    
    // Prevent rapid transitions
    if (isTransitioningRef.current) {
      console.log('[WORD-NAVIGATION] Transition in progress, ignoring');
      return;
    }

    // Debounce rapid calls (especially on mobile)
    if (now - lastWordChangeRef.current < 300) {
      console.log('[WORD-NAVIGATION] Navigation debounced');
      return;
    }

    lastWordChangeRef.current = now;
    isTransitioningRef.current = true;

    // Clear any auto-advance timers and stop current speech
    clearAutoAdvanceTimer();
    unifiedSpeechController.stop();

    console.log('[WORD-NAVIGATION] Going to next word', {
      from: currentWord?.word || 'none',
      index: currentIndex,
      total: wordList.length
    });

    try {
      // Update local state - move to next index
      const nextIndex = (currentIndex + 1) % wordList.length;
      console.log('[WORD-NAVIGATION] Moving from word', currentIndex, 'to', nextIndex);
      setCurrentIndex(nextIndex);

    } catch (error) {
      console.error('[WORD-NAVIGATION] Error navigating to next word:', error);
    } finally {
      // Always clear transition flag after a delay
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 200);
    }
  }, [
    currentIndex,
    currentWord,
    wordList.length,
    setCurrentIndex,
    isTransitioningRef,
    lastWordChangeRef,
    clearAutoAdvanceTimer
  ]);

  return {
    goToNext
  };
};
