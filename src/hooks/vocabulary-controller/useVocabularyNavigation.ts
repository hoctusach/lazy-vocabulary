
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { directSpeechService } from '@/services/speech/directSpeechService';

/**
 * Navigation controls for vocabulary words
 */
export const useVocabularyNavigation = (
  wordList: VocabularyWord[],
  currentIndex: number,
  setCurrentIndex: (index: number) => void,
  setIsSpeaking: (speaking: boolean) => void,
  clearAutoPlay: () => void
) => {
  // Navigation controls with enhanced state management
  const goToNext = useCallback(() => {
    console.log('[VOCAB-NAV] goToNext called');
    
    if (wordList.length === 0) return;
    
    clearAutoPlay();
    directSpeechService.stop();
    setIsSpeaking(false);
    
    const nextIndex = (currentIndex + 1) % wordList.length;
    console.log(`[VOCAB-NAV] Moving to index ${nextIndex}`);
    setCurrentIndex(nextIndex);
  }, [wordList.length, currentIndex, clearAutoPlay, setCurrentIndex, setIsSpeaking]);

  const goToPrevious = useCallback(() => {
    console.log('[VOCAB-NAV] goToPrevious called');
    
    if (wordList.length === 0) return;
    
    clearAutoPlay();
    directSpeechService.stop();
    setIsSpeaking(false);
    
    const prevIndex = currentIndex === 0 ? wordList.length - 1 : currentIndex - 1;
    console.log(`[VOCAB-NAV] Moving to index ${prevIndex}`);
    setCurrentIndex(prevIndex);
  }, [wordList.length, currentIndex, clearAutoPlay, setCurrentIndex, setIsSpeaking]);

  return {
    goToNext,
    goToPrevious
  };
};
