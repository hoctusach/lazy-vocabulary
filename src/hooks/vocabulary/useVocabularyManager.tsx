
import { useCallback, useRef, useEffect } from 'react';
import { vocabularyService } from '@/services/vocabularyService';
import { stopSpeaking } from '@/utils/speech';
import { useVocabularyData } from './useVocabularyData';
import { usePauseState } from './usePauseState';
import { useWordNavigation } from './useWordNavigation';

export const useVocabularyManager = () => {
  const {
    hasData,
    setHasData,
    currentWord,
    setCurrentWord,
    handleFileUploaded,
    lastManualActionTimeRef,
    currentWordRef,
    initialLoadDoneRef
  } = useVocabularyData();

  const { isPaused, setIsPaused } = usePauseState();
  
  const isSpeakingRef = useRef<boolean>(false);
  const isChangingWordRef = useRef<boolean>(false);
  const wordChangeInProgressRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const { displayNextWord, timerRef } = useWordNavigation(
    isPaused,
    setCurrentWord,
    lastManualActionTimeRef,
    wordChangeInProgressRef,
    clearTimer
  );

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
  }, [clearTimer, displayNextWord, setIsPaused]);

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
    
    const nextWord = vocabularyService.getNextWord();
    if (nextWord) {
      setCurrentWord(nextWord);
    }
    
    setTimeout(() => {
      isChangingWordRef.current = false;
      wordChangeInProgressRef.current = false;
    }, 800);
  }, [clearTimer]);

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
    
    const nextCategory = vocabularyService.nextSheet();
    console.log(`Switched to category: ${nextCategory}`);
    
    try {
      const storedStates = localStorage.getItem('buttonStates');
      const parsedStates = storedStates ? JSON.parse(storedStates) : {};
      parsedStates.currentCategory = nextCategory;
      localStorage.setItem('buttonStates', JSON.stringify(parsedStates));
    } catch (error) {
      console.error('Error saving category to localStorage:', error);
    }
    
    const nextWord = vocabularyService.getCurrentWord() || vocabularyService.getNextWord();
    if (nextWord) {
      setCurrentWord(nextWord);
    }
    
    setTimeout(() => {
      isChangingWordRef.current = false;
      wordChangeInProgressRef.current = false;
    }, 1000);
  }, [clearTimer]);

  // Handle initial data check and word display
  useEffect(() => {
    …
    if (hasExistingData && !initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      const word = vocabularyService.getCurrentWord() || vocabularyService.getNextWord();
      setCurrentWord(word);

      // → Removed the 500 ms displayNextWord timer so we don't flip
      //    before reading the first word aloud.
    }
    …
  }, [/* no longer need displayNextWord here */ isPaused, clearTimer]);
    
    return () => {
      clearTimer();
      stopSpeaking();
    };
  }, [displayNextWord, isPaused, clearTimer]);

  return {
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause,
    handleManualNext,
    handleSwitchCategory,
    setHasData,
    isSpeakingRef,
    isChangingWordRef
  };
};
