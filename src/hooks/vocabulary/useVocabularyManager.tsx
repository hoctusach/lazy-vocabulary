
import React, { useCallback, useRef, useState } from 'react';
import { vocabularyService } from '@/services/vocabularyService';
import { useVocabularyData } from './useVocabularyData';
import { usePauseState } from './usePauseState';
import { useWordNavigation } from './useWordNavigation';
import { useErrorHandling } from './useErrorHandling';
import { useVocabularyActions } from './useVocabularyActions';
import { useVocabularyFileHandler } from './useVocabularyFileHandler';
import { useVocabularySetup } from './useVocabularySetup';

export const useVocabularyManager = () => {
  const {
    hasData,
    setHasData,
    currentWord,
    setCurrentWord,
    handleFileUploaded: originalHandleFileUploaded,
    lastManualActionTimeRef,
    currentWordRef,
    initialLoadDoneRef
  } = useVocabularyData();

  const { isPaused, setIsPaused } = usePauseState();
  
  // Reference management
  const isSpeakingRef = useRef<boolean>(false);
  const isChangingWordRef = useRef<boolean>(false);
  const wordChangeInProgressRef = useRef(false);
  const manualOverrideRef = useRef(false);

  // Error handling
  const { jsonLoadError, handleVocabularyError } = useErrorHandling(
    setHasData,
    setCurrentWord
  );

  // Timer management
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Word navigation
  const { displayNextWord, timerRef } = useWordNavigation(
    isPaused,
    setCurrentWord,
    lastManualActionTimeRef,
    wordChangeInProgressRef,
    clearTimer
  );

  // Vocabulary actions
  const { 
    handleTogglePause,
    handleManualNext,
    handleSwitchCategory
  } = useVocabularyActions(
    setCurrentWord,
    clearTimer,
    wordChangeInProgressRef,
    lastManualActionTimeRef,
    isChangingWordRef,
    setIsPaused,
    timerRef,
    displayNextWord,
    manualOverrideRef
  );

  // File handler
  const { handleFileUploaded } = useVocabularyFileHandler({
    originalHandleFileUploaded,
    setHasData,
    setCurrentWord,
    setJsonLoadError: () => {}, // We use handleVocabularyError instead
    handleVocabularyError
  });

  // Setup effect
  useVocabularySetup(
    setHasData,
    setCurrentWord,
    initialLoadDoneRef,
    clearTimer
  );

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
    isChangingWordRef,
    jsonLoadError
  };
};
