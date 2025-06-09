
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { directSpeechService } from '@/services/speech/directSpeechService';

/**
 * Handles navigation controls for the vocabulary controller
 */
export const useVocabularyControllerNavigation = (
  wordList: VocabularyWord[],
  setCurrentIndex: (index: number | ((prevIndex: number) => number)) => void,
  setIsSpeaking: (speaking: boolean) => void,
  clearAutoPlay: () => void
) => {
  // Navigation controls with enhanced state management
  const goToNext = useCallback(() => {
    console.log('[VOCAB-CONTROLLER-NAV] goToNext called');
    
    if (wordList.length === 0) return;
    
    clearAutoPlay();
    directSpeechService.stop();
    setIsSpeaking(false);
    
    setCurrentIndex(prevIndex => {
      const nextIndex = (prevIndex + 1) % wordList.length;
      console.log(`[VOCAB-CONTROLLER-NAV] Moving to index ${nextIndex}`);
      return nextIndex;
    });
  }, [wordList.length, clearAutoPlay, setCurrentIndex, setIsSpeaking]);

  const goToPrevious = useCallback(() => {
    console.log('[VOCAB-CONTROLLER-NAV] goToPrevious called');
    
    if (wordList.length === 0) return;
    
    clearAutoPlay();
    directSpeechService.stop();
    setIsSpeaking(false);
    
    setCurrentIndex(prevIndex => {
      const prevIndexCalc = prevIndex === 0 ? wordList.length - 1 : prevIndex - 1;
      console.log(`[VOCAB-CONTROLLER-NAV] Moving to index ${prevIndexCalc}`);
      return prevIndexCalc;
    });
  }, [wordList.length, clearAutoPlay, setCurrentIndex, setIsSpeaking]);

  return {
    goToNext,
    goToPrevious
  };
};
