
import { useEffect, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { directSpeechService } from '@/services/speech/directSpeechService';
import { useVocabularyControllerState } from './useVocabularyControllerState';
import { useVocabularyControllerTiming } from './useVocabularyControllerTiming';
import { useVocabularyControllerNavigation } from './useVocabularyControllerNavigation';
import { useVocabularyControllerSpeech } from './useVocabularyControllerSpeech';
import { useVocabularyControllerControls } from './useVocabularyControllerControls';

/**
 * Enhanced vocabulary controller with region-specific timing and improved speech management
 */
export const useVocabularyController = (wordList: VocabularyWord[]) => {
  // Core state management
  const {
    currentIndex,
    setCurrentIndex,
    isPaused,
    setIsPaused,
    isMuted,
    setIsMuted,
    voiceRegion,
    setVoiceRegion,
    isSpeaking,
    setIsSpeaking,
    pausedRef,
    mutedRef,
    currentWordRef,
    autoPlayTimeoutRef,
    currentWord
  } = useVocabularyControllerState(wordList);

  // Timing management
  const { getRegionTiming } = useVocabularyControllerTiming();

  // Clear any pending auto-play
  const clearAutoPlay = useCallback(() => {
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
  }, [autoPlayTimeoutRef]);

  // Navigation controls
  const { goToNext, goToPrevious } = useVocabularyControllerNavigation(
    wordList,
    setCurrentIndex,
    setIsSpeaking,
    clearAutoPlay
  );

  // Speech functionality
  const { playCurrentWord } = useVocabularyControllerSpeech(
    currentWordRef,
    pausedRef,
    mutedRef,
    voiceRegion,
    setIsSpeaking,
    autoPlayTimeoutRef,
    goToNext,
    getRegionTiming
  );

  // Control functions
  const { togglePause, toggleMute, toggleVoice } = useVocabularyControllerControls(
    isPaused,
    isMuted,
    voiceRegion,
    setIsPaused,
    setIsMuted,
    setVoiceRegion,
    pausedRef,
    mutedRef,
    currentWordRef,
    setIsSpeaking,
    clearAutoPlay,
    playCurrentWord,
    getRegionTiming
  );

  // Enhanced auto-play effect with region-specific timing
  useEffect(() => {
    console.log('[VOCAB-CONTROLLER] Word changed effect');
    
    if (!currentWord) return;
    
    const timing = getRegionTiming(voiceRegion);
    
    // Clear any pending speech
    clearAutoPlay();
    directSpeechService.stop();
    setIsSpeaking(false);
    
    // Auto-play with region-specific delay if not paused or muted
    if (!pausedRef.current && !mutedRef.current) {
      const playDelay = setTimeout(() => {
        if (!pausedRef.current && !mutedRef.current) {
          playCurrentWord();
        }
      }, timing.resumeDelay);
      
      return () => clearTimeout(playDelay);
    }
  }, [currentWord, playCurrentWord, clearAutoPlay, getRegionTiming, voiceRegion, setIsSpeaking, pausedRef, mutedRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAutoPlay();
      directSpeechService.stop();
    };
  }, [clearAutoPlay]);

  return {
    // State
    currentWord,
    currentIndex,
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking,
    
    // Navigation
    goToNext,
    goToPrevious,
    
    // Controls
    togglePause,
    toggleMute,
    toggleVoice,
    playCurrentWord,
    
    // Utils
    wordCount: wordList.length
  };
};
