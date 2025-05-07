
import { useEffect, useCallback } from 'react';
import { vocabularyService } from '@/services/vocabularyService';
import { stopSpeaking } from '@/utils/speech';

export const useVocabularySetup = (
  setHasData: (hasData: boolean) => void,
  setCurrentWord: (word: any) => void,
  initialLoadDoneRef: React.MutableRefObject<boolean>,
  clearTimer: () => void
) => {
  
  useEffect(() => {
    // 1) Check if we already have data and set the flag
    try {
      const hasExistingData = vocabularyService.hasData();
      setHasData(hasExistingData);

      // 2) On first mount with data, just show the very first word
      if (hasExistingData && !initialLoadDoneRef.current) {
        initialLoadDoneRef.current = true;
        const firstWord =
          vocabularyService.getCurrentWord() ||
          vocabularyService.getNextWord();
        setCurrentWord(firstWord);
      }
    } catch (error) {
      console.error("Error checking vocabulary data:", error);
      // Try to load default vocabulary as a fallback
      try {
        vocabularyService.loadDefaultVocabulary();
        setHasData(true);
        
        if (!initialLoadDoneRef.current) {
          initialLoadDoneRef.current = true;
          const firstWord = vocabularyService.getCurrentWord() || vocabularyService.getNextWord();
          setCurrentWord(firstWord);
        }
      } catch (fallbackError) {
        console.error("Failed to load default vocabulary:", fallbackError);
      }
    }

    // 3) Cleanup: clear any pending timer and stop speech
    return () => {
      clearTimer();
      stopSpeaking();
    };
  }, [clearTimer, setHasData, setCurrentWord, initialLoadDoneRef]);
};
