
import { useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { BUTTON_STATES_KEY, PREFERRED_VOICE_KEY } from '@/utils/storageKeys';
import { getLastWord } from '@/utils/lastWordStorage';
import { findFuzzyIndex } from '@/utils/text/findFuzzyIndex';

/**
 * Data loading and persistence
 */
export const useVocabularyDataLoader = (
  setWordList: (words: VocabularyWord[]) => void,
  setHasData: (hasData: boolean) => void,
  setCurrentIndex: (index: number) => void,
  selectedVoiceName: string,
  clearAutoAdvanceTimer: () => void
) => {
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
    console.log('[DATA-LOADER] Loading initial vocabulary data');
    
    const loadData = () => {
      try {
        const words = vocabularyService.getWordList();
        console.log(`[DATA-LOADER] Loaded ${words.length} words`);

        setWordList(words);
        setHasData(words.length > 0);

        if (words.length > 0) {
          const category = vocabularyService.getCurrentSheetName();
          const savedWord = getLastWord(category);
          let startIndex = 0;
          if (savedWord) {
            const idx = findFuzzyIndex(words.map(w => w.word), savedWord);
            if (idx >= 0) {
              startIndex = idx;
            }
          }
          setCurrentIndex(startIndex);
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
    };
  }, [setWordList, setHasData, setCurrentIndex, clearAutoAdvanceTimer]);
};
