import { useEffect, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { setFavoriteVoice } from '@/lib/preferences/localPreferences';

/**
 * Data loading and persistence
 */
export const useVocabularyDataLoader = (
  setWordList: (words: VocabularyWord[]) => void,
  setHasData: (hasData: boolean) => void,
  setCurrentIndex: (index: number) => void,
  currentIndex: number,
  selectedVoiceName: string,
  clearAutoAdvanceTimer: () => void,
  initialWords?: VocabularyWord[]
) => {
  const startTimerRef = useRef<number | null>(null);
  const prevIndexRef = useRef(0);

  useEffect(() => {
    prevIndexRef.current = currentIndex;
  }, [currentIndex]);

  const clearStartTimer = () => {
    if (startTimerRef.current !== null) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
  };

  // Persist selected voice whenever it changes
  useEffect(() => {
    setFavoriteVoice(selectedVoiceName);
  }, [selectedVoiceName]);

  // Load initial data
  useEffect(() => {
    if (initialWords && initialWords.length > 0) {
      const prevIndex = prevIndexRef.current;
      setWordList(prevList => {
        const prevWord = prevList[prevIndex];
        const newList = initialWords;
        let newIndex = prevIndex;
        if (prevWord) {
          const foundIndex = newList.findIndex(
            w => w.word === prevWord.word && w.category === prevWord.category
          );
          if (foundIndex >= 0) {
            newIndex = foundIndex;
          } else {
            newIndex = Math.min(prevIndex, newList.length - 1);
          }
        } else {
          newIndex = Math.min(prevIndex, newList.length - 1);
        }
        setCurrentIndex(newIndex);
        return newList;
      });
      setHasData(true);
    } else {
      setWordList([]);
      setHasData(false);
    }

    return () => {
      clearAutoAdvanceTimer();
      clearStartTimer();
    };
  }, [initialWords, setWordList, setHasData, setCurrentIndex, clearAutoAdvanceTimer]);
};
