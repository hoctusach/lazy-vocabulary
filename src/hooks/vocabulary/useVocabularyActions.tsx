
import { useCallback, useRef } from 'react';
import { vocabularyService } from '@/services/vocabularyService';
import { stopSpeaking } from '@/utils/speech';

export const useVocabularyActions = (
  setCurrentWord: (word: any) => void, 
  clearTimer: () => void,
  wordChangeInProgressRef: React.MutableRefObject<boolean>,
  lastManualActionTimeRef: React.MutableRefObject<number>,
  isChangingWordRef: React.MutableRefObject<boolean>,
  setIsPaused: (isPaused: boolean | ((prev: boolean) => boolean)) => void,
  timerRef: React.MutableRefObject<number | null>,
  displayNextWord: () => void
) => {
  // Toggle pause state
  const handleTogglePause = useCallback(() => {
    lastManualActionTimeRef.current = Date.now();
    stopSpeaking();
    
    setIsPaused(prev => {
      const newPauseState = !prev;
      console.log(`Pause state changed to: ${newPauseState}`);
      
      if (!newPauseState) {
        clearTimer();
        timerRef.current = window.setTimeout(displayNextWord, 800);
      } else {
        clearTimer();
      }
      
      return newPauseState;
    });
  }, [clearTimer, displayNextWord, setIsPaused, lastManualActionTimeRef, timerRef]);

  // Manually go to next word
  const handleManualNext = useCallback(() => {
    if (wordChangeInProgressRef.current) {
      console.log("Word change already in progress, ignoring manual next request");
      return;
    }
    
    lastManualActionTimeRef.current = Date.now();
    clearTimer();
    stopSpeaking();
    
    wordChangeInProgressRef.current = true;
    isChangingWordRef.current = true;
    
    try {
      const nextWord = vocabularyService.getNextWord();
      if (nextWord) {
        setCurrentWord(nextWord);
      }
    } catch (error) {
      console.error("Error getting next word:", error);
      // Don't rethrow - gracefully continue
    } finally {
      setTimeout(() => {
        isChangingWordRef.current = false;
        wordChangeInProgressRef.current = false;
      }, 800);
    }
  }, [clearTimer, setCurrentWord, lastManualActionTimeRef, wordChangeInProgressRef, isChangingWordRef]);

  // Switch category
  const handleSwitchCategory = useCallback((isMuted: boolean, voiceRegion: 'US' | 'UK') => {
    if (wordChangeInProgressRef.current) {
      console.log("Word change in progress, ignoring category switch request");
      return;
    }
    
    lastManualActionTimeRef.current = Date.now();
    stopSpeaking();
    clearTimer();
    
    wordChangeInProgressRef.current = true;
    isChangingWordRef.current = true;
    
    try {
      const nextCategory = vocabularyService.nextSheet();
      console.log(`Switched to category: ${nextCategory}`);
      
      try {
        const storedStates = localStorage.getItem('buttonStates');
        const parsedStates = storedStates ? JSON.parse(storedStates) : {};
        parsedStates.currentCategory = nextCategory;
        localStorage.setItem('buttonStates', JSON.stringify(parsedStates));
      } catch (error) {
        console.error('Error saving category to localStorage:', error);
        // Continue even if localStorage fails
      }
      
      const nextWord = vocabularyService.getCurrentWord() || vocabularyService.getNextWord();
      if (nextWord) {
        setCurrentWord(nextWord);
      }
    } catch (error) {
      console.error("Error switching category:", error);
      // Don't rethrow - gracefully continue
    } finally {
      setTimeout(() => {
        isChangingWordRef.current = false;
        wordChangeInProgressRef.current = false;
      }, 1000);
    }
  }, [clearTimer, setCurrentWord, lastManualActionTimeRef, wordChangeInProgressRef, isChangingWordRef]);

  return {
    handleTogglePause,
    handleManualNext,
    handleSwitchCategory
  };
};
