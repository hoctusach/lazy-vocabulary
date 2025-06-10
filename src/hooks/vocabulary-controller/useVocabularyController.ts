
import { useEffect } from 'react';
import { unifiedSpeechService } from '@/services/speech/unifiedSpeechService';
import { useVocabularyState } from './useVocabularyState';
import { useSpeechControl } from './useSpeechControl';
import { useVocabularyNavigation } from './useVocabularyNavigation';
import { useVocabularyControls } from './useVocabularyControls';
import { useVocabularyData } from './useVocabularyData';

/**
 * Enhanced vocabulary controller with unified speech service and improved reliability
 */
export const useVocabularyController = () => {
  console.log('[VOCAB-CONTROLLER] === Main Controller Render ===');
  
  // Core state management
  const {
    wordList,
    setWordList,
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
    hasData,
    setHasData,
    currentWord,
    pausedRef,
    mutedRef,
    currentWordRef,
    autoPlayTimeoutRef,
    wordCount
  } = useVocabularyState();

  // Speech control with unified service
  const { playCurrentWord, clearAutoPlay, getRegionTiming } = useSpeechControl(
    voiceRegion,
    currentWordRef,
    pausedRef,
    mutedRef,
    autoPlayTimeoutRef,
    setIsSpeaking,
    () => {} // goToNext will be provided by navigation hook
  );

  // Navigation with unified service
  const { goToNext, goToPrevious } = useVocabularyNavigation(
    wordList,
    currentIndex,
    setCurrentIndex,
    setIsSpeaking,
    clearAutoPlay
  );

  // Update speech control with navigation function
  const speechControl = useSpeechControl(
    voiceRegion,
    currentWordRef,
    pausedRef,
    mutedRef,
    autoPlayTimeoutRef,
    setIsSpeaking,
    goToNext
  );

  // Control functions with unified service
  const { togglePause, toggleMute, toggleVoice } = useVocabularyControls(
    isPaused,
    setIsPaused,
    isMuted,
    setIsMuted,
    voiceRegion,
    setVoiceRegion,
    pausedRef,
    mutedRef,
    currentWordRef,
    setIsSpeaking,
    clearAutoPlay,
    speechControl.playCurrentWord,
    getRegionTiming
  );

  // Data loading
  const { loadVocabularyData, handleFileUploaded } = useVocabularyData(
    setWordList,
    setCurrentIndex,
    setHasData
  );

  // Enhanced auto-play effect with region-specific timing and mobile optimization
  useEffect(() => {
    console.log('[VOCAB-CONTROLLER] Word changed effect');
    
    if (!currentWord) return;
    
    const timing = getRegionTiming(voiceRegion);
    
    // Clear any pending speech
    clearAutoPlay();
    unifiedSpeechService.stop();
    setIsSpeaking(false);
    
    // Auto-play with region-specific delay if not paused or muted
    if (!pausedRef.current && !mutedRef.current) {
      const playDelay = setTimeout(() => {
        if (!pausedRef.current && !mutedRef.current) {
          speechControl.playCurrentWord();
        }
      }, timing.resumeDelay);
      
      return () => clearTimeout(playDelay);
    }
  }, [currentWord, speechControl.playCurrentWord, clearAutoPlay, getRegionTiming, voiceRegion, pausedRef, mutedRef, setIsSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAutoPlay();
      unifiedSpeechService.stop();
    };
  }, [clearAutoPlay]);

  return {
    // State
    wordList,
    currentWord,
    currentIndex,
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking,
    hasData,
    
    // Navigation
    goToNext,
    goToPrevious,
    
    // Controls
    togglePause,
    toggleMute,
    toggleVoice,
    playCurrentWord: speechControl.playCurrentWord,
    
    // Data management
    loadVocabularyData,
    handleFileUploaded,
    
    // Utils
    wordCount
  };
};
