
import { useVocabularyContainerState } from "@/hooks/vocabulary/useVocabularyContainerState";
import { useVocabularyPlayback } from "@/hooks/vocabulary-playback";
import { useWordModalState } from "@/hooks/vocabulary/useWordModalState";
import { vocabularyService } from "@/services/vocabularyService";

/**
 * Manages all state for the vocabulary app
 */
export const useVocabularyAppState = () => {
  // Get base vocabulary state
  const {
    hasData,
    hasAnyData,
    handleFileUploaded,
    jsonLoadError,
    handleSwitchCategory,
    currentCategory,
    nextCategory,
    displayTime
  } = useVocabularyContainerState();

  const wordList = vocabularyService.getWordList();

  // Use our new unified playback hook for all speech functionality
  const {
    muted,
    paused,
    voices,
    selectedVoice,
    toggleMute,
    togglePause,
    goToNextWord,
    cycleVoice,
    cancelSpeech,
    currentWord: playbackCurrentWord,
    userInteractionRef,
    hasUserInteracted,
    onUserInteraction,
    isSpeaking,
    allVoiceOptions
  } = useVocabularyPlayback(wordList || []);

  // Modal state management
  const {
    isAddWordModalOpen,
    isEditMode,
    wordToEdit,
    handleOpenAddWordModal,
    handleOpenEditWordModal,
    handleCloseModal
  } = useWordModalState();

  return {
    // Base state
    hasData,
    hasAnyData,
    handleFileUploaded,
    jsonLoadError,
    handleSwitchCategory,
    currentCategory,
    nextCategory,
    displayTime,
    wordList,
    
    // Playback state
    muted,
    paused,
    voices,
    selectedVoice,
    toggleMute,
    togglePause,
    goToNextWord,
    cycleVoice,
    playCurrentWord,
    cancelSpeech,
    playbackCurrentWord,
    userInteractionRef,
    hasUserInteracted,
    onUserInteraction,
    isSpeaking,
    allVoiceOptions,
    
    // Modal state
    isAddWordModalOpen,
    isEditMode,
    wordToEdit,
    handleOpenAddWordModal,
    handleOpenEditWordModal,
    handleCloseModal
  };
};
