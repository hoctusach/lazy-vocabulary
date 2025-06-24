
import { useEffect, useMemo } from 'react';
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
 */
export const useUnifiedVocabularyController = () => {
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
    voiceRegion,
    setVoiceRegion,
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
  } = useSpeechIntegration(currentWord, voiceRegion, isPaused, isMuted, isTransitioningRef);

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
    clearAutoAdvanceTimer
  );

  // Control actions with proper audio management - fix the parameter count
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
    speechState
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
  const handleWordComplete = useMemo(() => {
    return () => {
      if (isTransitioningRef.current) {
        console.log('[UNIFIED-CONTROLLER] Word transition in progress, skipping auto-advance');
        return;
      }
      
      if (isPaused || isMuted) {
        console.log('[UNIFIED-CONTROLLER] Paused or muted, skipping auto-advance');
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
