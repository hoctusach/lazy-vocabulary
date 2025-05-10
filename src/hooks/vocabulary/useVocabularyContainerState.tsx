
import { useVocabularyManager } from "@/hooks/vocabulary/useVocabularyManager";
import { useMuteToggle } from "@/hooks/useMuteToggle";
import { useVocabularyAudioSync } from "@/hooks/useVocabularyAudioSync";
import { useAudioPlayback } from "@/components/vocabulary-app/useAudioPlayback";
import { useModalState } from "./useModalState";
import { useCategoryNavigation } from "./useCategoryNavigation";
import { useSpeechControl } from "./useSpeechControl";

export const useVocabularyContainerState = () => {
  // Get modal state
  const { isAddWordModalOpen, setIsAddWordModalOpen } = useModalState();

  // Get speech control
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
    retrySpeechInitialization,
    handlePauseResume
  } = useSpeechControl();

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

  // Custom pause handler wrapper
  const handlePauseResumeWrapper = () => {
    const newPauseState = handlePauseResume(isPaused);
    handleTogglePause();
  };

  // Get category information
  const { currentCategory, nextCategory } = useCategoryNavigation();

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
    handleTogglePause: handlePauseResumeWrapper,
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
