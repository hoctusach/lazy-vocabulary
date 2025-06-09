
import { useState, useCallback, useMemo } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

export const useSimpleWordNavigation = (wordList: VocabularyWord[]) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Calculate current word with enhanced debugging
  const currentWord = useMemo(() => {
    console.log('[SIMPLE-WORD-NAV] === Navigation Word Calculation ===');
    console.log('[SIMPLE-WORD-NAV] Word list length:', wordList?.length || 0);
    console.log('[SIMPLE-WORD-NAV] Current index:', currentIndex);
    
    if (!wordList || wordList.length === 0) {
      console.log('[SIMPLE-WORD-NAV] No words available');
      return null;
    }
    
    if (currentIndex < 0 || currentIndex >= wordList.length) {
      console.log('[SIMPLE-WORD-NAV] Index out of bounds, resetting to 0');
      setCurrentIndex(0);
      return wordList[0] || null;
    }
    
    const word = wordList[currentIndex];
    console.log('[SIMPLE-WORD-NAV] Current word calculated:', {
      index: currentIndex,
      word: word?.word,
      fullWord: word
    });
    
    return word;
  }, [wordList, currentIndex]);

  const advanceToNext = useCallback(() => {
    if (!wordList || wordList.length === 0) {
      console.log('[SIMPLE-WORD-NAV] Cannot advance - no words');
      return;
    }
    
    setCurrentIndex(prevIndex => {
      const nextIndex = (prevIndex + 1) % wordList.length;
      console.log('[SIMPLE-WORD-NAV] Advancing to next word:', {
        from: prevIndex,
        to: nextIndex,
        nextWord: wordList[nextIndex]?.word
      });
      return nextIndex;
    });
  }, [wordList]);

  const goToPrevious = useCallback(() => {
    if (!wordList || wordList.length === 0) {
      console.log('[SIMPLE-WORD-NAV] Cannot go to previous - no words');
      return;
    }
    
    setCurrentIndex(prevIndex => {
      const prevIndexCalc = prevIndex === 0 ? wordList.length - 1 : prevIndex - 1;
      console.log('[SIMPLE-WORD-NAV] Going to previous word:', {
        from: prevIndex,
        to: prevIndexCalc,
        previousWord: wordList[prevIndexCalc]?.word
      });
      return prevIndexCalc;
    });
  }, [wordList]);

  const goToWord = useCallback((index: number) => {
    if (!wordList || wordList.length === 0) {
      console.log('[SIMPLE-WORD-NAV] Cannot go to word - no words');
      return;
    }
    
    if (index < 0 || index >= wordList.length) {
      console.log('[SIMPLE-WORD-NAV] Invalid index for goToWord:', index);
      return;
    }
    
    console.log('[SIMPLE-WORD-NAV] Going to specific word:', {
      from: currentIndex,
      to: index,
      targetWord: wordList[index]?.word
    });
    setCurrentIndex(index);
  }, [wordList, currentIndex]);

  // Debug logging when state changes
  console.log('[SIMPLE-WORD-NAV] Current navigation state:', {
    currentIndex,
    currentWord: currentWord?.word || 'null',
    wordListLength: wordList?.length || 0
  });

  return {
    currentIndex,
    currentWord,
    advanceToNext,
    goToPrevious,
    goToWord
  };
};
