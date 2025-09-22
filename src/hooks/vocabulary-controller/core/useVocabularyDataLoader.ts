import { useEffect, useMemo, useRef } from 'react';
import type { DailySelection } from '@/types/learning';
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
  initialWords?: VocabularyWord[],
  selection?: DailySelection | null
) => {
  const startTimerRef = useRef<number | null>(null);
  const prevIndexRef = useRef(0);

  const selectionKey = useMemo(() => {
    if (!selection) return 'none';
    const mode = selection.mode ?? 'unknown';
    const category = selection.category ?? 'ALL';
    const date = selection.date ?? 'unknown-date';
    return `${date}|${mode}|${category}|${selection.totalCount}`;
  }, [selection?.category, selection?.date, selection?.mode, selection?.totalCount]);

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
      const hasPlannedWords = Boolean(selection && selection.totalCount > 0);
      const hasLoadedWords = Boolean(initialWords && initialWords.length > 0);
      setHasData(hasPlannedWords && hasLoadedWords);
    }

    return () => {
      clearAutoAdvanceTimer();
      clearStartTimer();
    };
  }, [
    initialWords,
    selectionKey,
    setWordList,
    setHasData,
    setCurrentIndex,
    clearAutoAdvanceTimer,
  ]);
};
