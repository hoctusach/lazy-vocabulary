
import { VocabularyWord } from '@/types/vocabulary';

/**
 * Hook for calculating and debugging current word selection
 */
export const useCurrentWordCalculation = (
  wordList: VocabularyWord[],
  currentIndex: number
) => {
  // Enhanced current word calculation with comprehensive debugging
  const currentWord = (() => {
    console.log('[CURRENT-WORD-CALC] === Current Word Calculation Debug ===');
    console.log('[CURRENT-WORD-CALC] Word list length:', wordList?.length || 0);
    console.log('[CURRENT-WORD-CALC] Current index:', currentIndex);
    console.log('[CURRENT-WORD-CALC] Word list sample:', wordList?.slice(0, 3).map(w => w.word));
    
    if (!wordList || wordList.length === 0) {
      console.log('[CURRENT-WORD-CALC] No word list available');
      return null;
    }
    
    if (currentIndex < 0 || currentIndex >= wordList.length) {
      console.log('[CURRENT-WORD-CALC] Index out of bounds, clamping to valid range');
      const clampedIndex = Math.max(0, Math.min(currentIndex, wordList.length - 1));
      const word = wordList[clampedIndex];
      console.log('[CURRENT-WORD-CALC] Clamped index:', clampedIndex, 'Word:', word?.word);
      return word;
    }
    
    const word = wordList[currentIndex];
    console.log('[CURRENT-WORD-CALC] Selected word at index', currentIndex, ':', word?.word);
    return word;
  })();

  console.log('[CURRENT-WORD-CALC] Final return - currentWord:', currentWord?.word);

  return {
    currentWord
  };
};
