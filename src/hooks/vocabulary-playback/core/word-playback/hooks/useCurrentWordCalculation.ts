
import { useMemo } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

/**
 * Hook for calculating the current word based on word list and index
 * Enhanced with better synchronization and debugging
 */
export const useCurrentWordCalculation = (wordList: VocabularyWord[], currentIndex: number) => {
  const currentWord = useMemo(() => {
    console.log('[CURRENT-WORD-CALC] === Current Word Calculation Debug ===');
    console.log('[CURRENT-WORD-CALC] Word list length:', wordList.length);
    console.log('[CURRENT-WORD-CALC] Current index:', currentIndex);
    
    if (!wordList || wordList.length === 0) {
      console.log('[CURRENT-WORD-CALC] No word list available');
      return null;
    }
    
    if (currentIndex < 0 || currentIndex >= wordList.length) {
      console.log('[CURRENT-WORD-CALC] Index out of bounds:', { currentIndex, wordListLength: wordList.length });
      return null;
    }
    
    const word = wordList[currentIndex];
    console.log('[CURRENT-WORD-CALC] Calculated current word:', {
      index: currentIndex,
      word: word?.word,
      wordObject: word
    });
    
    return word;
  }, [wordList, currentIndex]);

  // Additional debug logging when either dependency changes
  console.log('[CURRENT-WORD-CALC] Dependencies changed:', {
    wordListLength: wordList?.length || 0,
    currentIndex,
    resultingWord: currentWord?.word || 'null'
  });

  return {
    currentWord
  };
};
