import { useEffect, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { learningProgressService } from '@/services/learningProgressService';
import { getPreferences, savePreferences } from '@/lib/db/preferences';
import { setFavoriteVoice } from '@/lib/preferences/localPreferences';
import { getTodayLastWord } from '@/utils/lastWordStorage';
import type { SeverityLevel } from '@/types/learning';

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
      return;
    }

    console.log('[DATA-LOADER] Loading initial vocabulary data');

    const loadData = async () => {
      clearStartTimer();
      try {
        if (!vocabularyService.hasData()) {
          await vocabularyService.loadDefaultVocabulary();
        }
        const allWords = vocabularyService.getAllWords();
        console.log(`[DATA-LOADER] Loaded ${allWords.length} words`);

        let severity: SeverityLevel = 'light';
        try {
          const prefs = await getPreferences();
          severity = (prefs.daily_option as SeverityLevel) || 'light';
          if (!prefs.daily_option) {
            await savePreferences({ daily_option: 'light' });
          }
        } catch {
          // ignore preference loading errors
        }

        const selection =
          learningProgressService.getTodaySelection() ||
          learningProgressService.forceGenerateDailySelection(allWords, severity);

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

    void loadData();

    // Subscribe to vocabulary changes
    const handleVocabularyChange = () => {
      console.log('[DATA-LOADER] Vocabulary data changed, reloading');
      clearAutoAdvanceTimer(); // Clear timer when data changes
      void loadData();
    };

    vocabularyService.addVocabularyChangeListener(handleVocabularyChange);

    return () => {
      vocabularyService.removeVocabularyChangeListener(handleVocabularyChange);
      clearAutoAdvanceTimer(); // Clean up on unmount
      clearStartTimer();
    };
  }, [initialWords, setWordList, setHasData, setCurrentIndex, clearAutoAdvanceTimer]);
};
