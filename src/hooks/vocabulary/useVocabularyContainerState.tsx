
import { useState } from "react";
import { useVocabularyManager } from "@/hooks/vocabulary/useVocabularyManager";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useMuteToggle } from "@/hooks/useMuteToggle";
import { useVocabularyAudioSync } from "@/hooks/useVocabularyAudioSync";
import { vocabularyService } from "@/services/vocabularyService";
import { useAudioPlayback } from "@/components/vocabulary-app/useAudioPlayback";

export const useVocabularyContainerState = () => {
  // Modal state
  const [isAddWordModalOpen, setIsAddWordModalOpen] = useState(false);

  // Vocabulary manager for handling word navigation
  const {
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause,
    handleManualNext,
    handleSwitchCategory,
    setHasData,
    jsonLoadError
  } = useVocabularyManager();

  // Speech synthesis for voice management
  const {
    isMuted,
    voiceRegion,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    pauseRequestedRef,
    speechError,
    hasSpeechPermission,
    retrySpeechInitialization
  } = useSpeechSynthesis();

  // Audio sync management
  const {
    isSoundPlaying,
    setIsSoundPlaying,
    autoAdvanceTimerRef,
    displayTime,
    setDisplayTime,
    lastSpokenWordRef,
    wordChangeProcessingRef,
    speechAttemptsRef,
    clearAutoAdvanceTimer,
    resetLastSpokenWord
  } = useVocabularyAudioSync(currentWord, isPaused, isMuted, voiceRegion);

  // Mute toggle functionality
  const { mute, toggleMute } = useMuteToggle(
    isMuted, 
    handleToggleMute, 
    currentWord, 
    isPaused,
    clearAutoAdvanceTimer,
    stopSpeaking,
    voiceRegion
  );

  // Custom pause handler that uses the soft-pause approach
  const handlePauseResume = () => {
    if (isPaused) {
      // If we're resuming, call the regular toggle function and also resume speech
      handleTogglePause();
      resumeSpeaking();
    } else {
      // If we're pausing, use our soft-pause approach
      pauseSpeaking(); // This now sets pauseRequestedRef.current = true
      handleTogglePause();
    }
  };

  // Current and next category information
  const currentCategory = vocabularyService.getCurrentSheetName();
  const sheetOptions = vocabularyService.sheetOptions;
  const nextIndex = (sheetOptions.indexOf(currentCategory) + 1) % sheetOptions.length;
  const nextCategory = sheetOptions[nextIndex];

  // Audio playback hook to manage speech and auto-advancement
  useAudioPlayback(
    currentWord,
    isPaused,
    mute,
    voiceRegion,
    handleManualNext,
    isSoundPlaying,
    setIsSoundPlaying,
    clearAutoAdvanceTimer,
    autoAdvanceTimerRef,
    lastSpokenWordRef,
    wordChangeProcessingRef,
    speechAttemptsRef,
    stopSpeaking,
    displayTime,
    pauseRequestedRef
  );

  // Combine all state and handlers
  return {
    // Modal state
    isAddWordModalOpen,
    setIsAddWordModalOpen,
    
    // Vocabulary state
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause: handlePauseResume, // Use our custom handler
    handleManualNext,
    jsonLoadError,
    
    // Speech state
    mute,
    voiceRegion,
    toggleMute,
    handleChangeVoice,
    speechError,
    hasSpeechPermission,
    retrySpeechInitialization,
    
    // Category info
    handleSwitchCategory,
    currentCategory,
    nextCategory,
    
    // Audio playback state
    isSoundPlaying,
    displayTime,
    
    // Debug data
    debugPanelData: currentWord ? {
      word: currentWord.word,
      category: currentWord.category || currentCategory
    } : null
  };
};
