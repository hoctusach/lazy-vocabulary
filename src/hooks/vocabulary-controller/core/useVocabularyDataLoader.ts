
import { useEffect, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { learningProgressService } from '@/services/learningProgressService';
import { BUTTON_STATES_KEY, PREFERRED_VOICE_KEY } from '@/utils/storageKeys';
import { getTodayLastWord } from '@/utils/lastWordStorage';

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
    try {
      const storedStates = localStorage.getItem(BUTTON_STATES_KEY);
      const states = storedStates ? JSON.parse(storedStates) : {};
      states.preferredVoiceName = selectedVoiceName;
      localStorage.setItem(BUTTON_STATES_KEY, JSON.stringify(states));
      localStorage.setItem(PREFERRED_VOICE_KEY, selectedVoiceName);
    } catch (error) {
      console.error('Error saving voice to localStorage:', error);
    }
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
      return;
    }

    console.log('[DATA-LOADER] Loading initial vocabulary data');

    const loadData = () => {
      clearStartTimer();
      try {
        const allWords = vocabularyService.getWordList();
        console.log(`[DATA-LOADER] Loaded ${allWords.length} words`);

        const selection =
          learningProgressService.getTodaySelection() ||
          learningProgressService.forceGenerateDailySelection(allWords, 'light');

        let todayWords: VocabularyWord[] = [];
        if (selection) {
          // Review words should come before new words so playback prioritizes due items
          const progressList = [...selection.reviewWords, ...selection.newWords];
          const map = new Map<string, VocabularyWord>();
          progressList.forEach(p => {
            const w = allWords.find(
              word => word.word === p.word && word.category === p.category
            );
            if (w) {
              map.set(`${w.word}__${w.category}`, {
                ...w,
                nextAllowedTime: p.nextAllowedTime
              });
            }
          });
          todayWords = Array.from(map.values());
        }

        if (todayWords.length === 0) {
          console.log(
            '[DATA-LOADER] No daily selection available, falling back to full list'
          );
          todayWords = allWords;
        }

        setWordList(todayWords);
        setHasData(todayWords.length > 0);

        if (todayWords.length > 0) {
          const saved = getTodayLastWord();
          const now = Date.now();

          if (
            saved &&
            typeof saved.index === 'number' &&
            saved.index >= 0 &&
            saved.index < todayWords.length
          ) {
            setCurrentIndex(saved.index);
            return;
          }

          const dueIndex = todayWords.findIndex(w => {
            if (!w.nextAllowedTime) return true;
            return Date.parse(w.nextAllowedTime) <= now;
          });

          if (dueIndex >= 0) {
            setCurrentIndex(dueIndex);
          } else {
            setCurrentIndex(0);
            const nextTimes = todayWords
              .map(w =>
                w.nextAllowedTime ? Date.parse(w.nextAllowedTime) : Infinity
              )
              .filter(t => !isNaN(t) && t !== Infinity);
            if (nextTimes.length > 0) {
              const earliest = Math.min(...nextTimes);
              const delay = Math.max(0, earliest - now);
              startTimerRef.current = window.setTimeout(() => {
                loadData();
              }, delay);
            }
          }
        }
      } catch (error) {
        console.error('[DATA-LOADER] Error loading vocabulary data:', error);
        setHasData(false);
      }
    };

    loadData();

    // Subscribe to vocabulary changes
    const handleVocabularyChange = () => {
      console.log('[DATA-LOADER] Vocabulary data changed, reloading');
      clearAutoAdvanceTimer(); // Clear timer when data changes
      loadData();
    };

    vocabularyService.addVocabularyChangeListener(handleVocabularyChange);

    return () => {
      vocabularyService.removeVocabularyChangeListener(handleVocabularyChange);
      clearAutoAdvanceTimer(); // Clean up on unmount
      clearStartTimer();
    };
  }, [initialWords, setWordList, setHasData, setCurrentIndex, clearAutoAdvanceTimer]);
};
