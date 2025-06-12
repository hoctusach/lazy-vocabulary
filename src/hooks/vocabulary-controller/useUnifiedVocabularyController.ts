
import { useEffect } from 'react';
import { vocabularyService } from '@/services/vocabularyService';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';
import { useVocabularyState } from './core/useVocabularyState';
import { useTimerManagement } from './core/useTimerManagement';
import { useSpeechIntegration } from './core/useSpeechIntegration';
import { useWordNavigation } from './core/useWordNavigation';
import { useVocabularyControls } from './core/useVocabularyControls';
import { useVocabularyDataLoader } from './core/useVocabularyDataLoader';

/**
 * Unified Vocabulary Controller - Single source of truth for vocabulary state
 * Refactored version with modular architecture
 */
export const useUnifiedVocabularyController = () => {
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
    voiceRegion,
    setVoiceRegion,
    currentWord,
    isTransitioningRef,
    lastWordChangeRef
  } = useVocabularyState();

  // Timer management
  const {
    clearAutoAdvanceTimer,
    scheduleAutoAdvance
  } = useTimerManagement(isPaused, isMuted);

  // Speech integration
  const {
    speechState,
    playCurrentWord
  } = useSpeechIntegration(currentWord, voiceRegion, isPaused, isMuted, isTransitioningRef);

  // Word navigation
  const {
    goToNext
  } = useWordNavigation(
    wordList,
    currentIndex,
    setCurrentIndex,
    currentWord,
    isTransitioningRef,
    lastWordChangeRef,
    clearAutoAdvanceTimer
  );

  // Control actions
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
    voiceRegion,
    setVoiceRegion,
    currentWord,
    speechState,
    playCurrentWord,
    clearAutoAdvanceTimer,
    scheduleAutoAdvance
  );

  // Data loading
  useVocabularyDataLoader(
    setWordList,
    setHasData,
    setCurrentIndex,
    voiceRegion,
    clearAutoAdvanceTimer
  );

  // Set up word completion callback with auto-advance
  useEffect(() => {
    const handleWordComplete = () => {
      if (isTransitioningRef.current) {
        console.log('[UNIFIED-CONTROLLER] Word transition in progress, skipping auto-advance');
        return;
      }
      
      console.log('[UNIFIED-CONTROLLER] Word completed, scheduling auto-advance');
      scheduleAutoAdvance(1500, goToNext);
    };

    unifiedSpeechController.setWordCompleteCallback(handleWordComplete);
    
    return () => {
      unifiedSpeechController.setWordCompleteCallback(null);
    };
  }, [scheduleAutoAdvance, goToNext, isTransitioningRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAutoAdvanceTimer();
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
    voiceRegion,
    isSpeaking: speechState.isActive,
    
    // Actions
    goToNext,
    togglePause,
    toggleMute,
    toggleVoice,
    switchCategory,
    playCurrentWord
  };
};
