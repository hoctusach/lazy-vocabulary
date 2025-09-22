
import { useEffect, useMemo, useCallback } from 'react';
import { vocabularyService } from '@/services/vocabularyService';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';
import { useVocabularyState } from './core/useVocabularyState';
import { useTimerManagement } from './core/useTimerManagement';
import { useSpeechIntegration } from './core/useSpeechIntegration';
import { useWordNavigation } from './core/useWordNavigation';
import { useVocabularyControls } from './core/useVocabularyControls';
import { useVocabularyDataLoader } from './core/useVocabularyDataLoader';
import { saveLastWord, saveTodayLastWord } from '@/utils/lastWordStorage';
import type { DailySelection } from '@/types/learning';
import { VocabularyWord } from '@/types/vocabulary';

/**
 * Unified Vocabulary Controller - Single source of truth for vocabulary state
 */
export const useUnifiedVocabularyController = (
  initialWords?: VocabularyWord[],
  selection?: DailySelection | null
) => {
  console.log('[UNIFIED-CONTROLLER] Initializing controller');

  // Core state management
  const {
    wordList,
    setWordList,
    currentIndex,
    setCurrentIndex,
    hasData,
    setHasData,
    isPaused,
    setIsPaused,
    isMuted,
    setIsMuted,
    selectedVoiceName,
    setSelectedVoiceName,
    allVoices,
    currentWord,
    isTransitioningRef,
    lastWordChangeRef
  } = useVocabularyState();

  // Timer management with debouncing
  const {
    clearAutoAdvanceTimer,
    scheduleAutoAdvance
  } = useTimerManagement(isPaused, isMuted);

  // Speech integration with error recovery
  const {
    speechState,
    playCurrentWord
  } = useSpeechIntegration(currentWord, selectedVoiceName, isPaused, isMuted, isTransitioningRef);

  // Word navigation with proper state management
  const {
    goToNext
  } = useWordNavigation(
    wordList,
    currentIndex,
    setCurrentIndex,
    currentWord,
    isTransitioningRef,
    lastWordChangeRef,
    clearAutoAdvanceTimer,
    playCurrentWord
  );

  const goToNextAndSpeak = useCallback(() => {
    const now = Date.now();
    if (isTransitioningRef.current) return;
    if (now - lastWordChangeRef.current < 300) return;
    lastWordChangeRef.current = now;
    isTransitioningRef.current = true;
    clearAutoAdvanceTimer();
    unifiedSpeechController.stop();

    const nextIndex = (currentIndex + 1) % wordList.length;
    setCurrentIndex(nextIndex);
    const nextWord = wordList[nextIndex];
    if (nextWord) {
      saveLastWord(vocabularyService.getCurrentSheetName(), nextWord.word);
      saveTodayLastWord(nextIndex, nextWord.word, nextWord.category);
      if (!isPaused) {
        unifiedSpeechController.speak(nextWord, selectedVoiceName);
      }
    }

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 200);
  }, [
    currentIndex,
    wordList.length,
    setCurrentIndex,
    isPaused,
    selectedVoiceName,
    clearAutoAdvanceTimer
  ]);

  // Control actions with simplified parameters
  const {
    togglePause,
    toggleMute,
    toggleVoice,
    switchCategory
  } = useVocabularyControls(
    isPaused,
    setIsPaused,
    isMuted,
    setIsMuted,
    allVoices,
    selectedVoiceName,
    setSelectedVoiceName,
    speechState,
    currentWord
  );

  // Data loading
  useVocabularyDataLoader(
    setWordList,
    setHasData,
    setCurrentIndex,
    currentIndex,
    selectedVoiceName,
    clearAutoAdvanceTimer,
    initialWords,
    selection
  );

  // Set up word completion callback with auto-advance
  const handleWordComplete = useMemo(() => {
    return () => {
      if (isTransitioningRef.current) {
        console.log('[UNIFIED-CONTROLLER] Word transition in progress, skipping auto-advance');
        return;
      }
      
      if (isPaused) {
        console.log('[UNIFIED-CONTROLLER] Paused, skipping auto-advance');
        return;
      }
      
      console.log('[UNIFIED-CONTROLLER] Word completed, advancing to next');
      goToNext();
    };
  }, [goToNext, isTransitioningRef, isPaused, isMuted]);

  useEffect(() => {
    unifiedSpeechController.setWordCompleteCallback(handleWordComplete);
    
    return () => {
      unifiedSpeechController.setWordCompleteCallback(null);
    };
  }, [handleWordComplete]);

  // Mute/unmute speech when state changes
  useEffect(() => {
    console.log(`[UNIFIED-CONTROLLER] Setting muted: ${isMuted}`);
    unifiedSpeechController.setMuted(isMuted);
  }, [isMuted]);

  // Persist last viewed word for the current category
  useEffect(() => {
    if (currentWord) {
      saveLastWord(vocabularyService.getCurrentSheetName(), currentWord.word);
      saveTodayLastWord(currentIndex, currentWord.word, currentWord.category);
    }
  }, [currentWord?.word, currentWord?.category, currentIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAutoAdvanceTimer();
      unifiedSpeechController.stop();
    };
  }, [clearAutoAdvanceTimer]);

  return {
    // Data state
    currentWord,
    hasData,
    currentCategory: vocabularyService.getCurrentSheetName(),
    
    // Control state
    isPaused,
    isMuted,
    selectedVoiceName,
    allVoices,
    isSpeaking: speechState.isActive,

    // Actions
    goToNext,
    goToNextAndSpeak,
    togglePause,
    toggleMute,
    toggleVoice,
    switchCategory,
    playCurrentWord
  };
};
