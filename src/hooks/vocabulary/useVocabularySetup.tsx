import * as React from 'react';
import { useEffect } from 'react';
import { vocabularyService } from '@/services/vocabularyService';
import { stopSpeaking } from '@/utils/speech';

export const useVocabularySetup = (
  setHasData: (hasData: boolean) => void,
  setCurrentWord: (word: any) => void,
  initialLoadDoneRef: React.MutableRefObject<boolean>,
  clearTimer: () => void
) => {
  
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        let hasExistingData = vocabularyService.hasData();

        if (!hasExistingData) {
          await vocabularyService.loadDefaultVocabulary();
          hasExistingData = vocabularyService.hasData();
        }

        if (!isMounted) return;

        setHasData(hasExistingData);

        if (hasExistingData && !initialLoadDoneRef.current) {
          initialLoadDoneRef.current = true;
          const firstWord =
            vocabularyService.getCurrentWord() || vocabularyService.getNextWord();
          setCurrentWord(firstWord);
        }
      } catch (error) {
        console.error("Error during vocabulary setup:", error);
      }
    };

    initialize();

    // Cleanup: clear any pending timer and stop speech
    return () => {
      isMounted = false;
      clearTimer();
      stopSpeaking();
    };
  }, [clearTimer, setHasData, setCurrentWord, initialLoadDoneRef]);
};
