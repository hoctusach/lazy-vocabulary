
import { useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';

/**
 * Data loading and persistence
 */
export const useVocabularyDataLoader = (
  setWordList: (words: VocabularyWord[]) => void,
  setHasData: (hasData: boolean) => void,
  setCurrentIndex: (index: number) => void,
  voiceRegion: 'US' | 'UK' | 'AU',
  clearAutoAdvanceTimer: () => void
) => {
  // Persist voice region whenever it changes
  useEffect(() => {
    try {
      const storedStates = localStorage.getItem('buttonStates');
      const states = storedStates ? JSON.parse(storedStates) : {};
      states.voiceRegion = voiceRegion;
      localStorage.setItem('buttonStates', JSON.stringify(states));
    } catch (error) {
      console.error('Error saving voice region to localStorage:', error);
    }
  }, [voiceRegion]);

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
          setCurrentIndex(0);
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
