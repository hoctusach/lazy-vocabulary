
import React from "react";
import VocabularyLayout from "@/components/VocabularyLayout";
import WelcomeScreen from "@/components/WelcomeScreen";
import ErrorDisplay from "./ErrorDisplay";
import ContentWithData from "./ContentWithData";
import { useVocabularyContainerState } from "@/hooks/vocabulary/useVocabularyContainerState";
import VocabularyWordManager from "./word-management/VocabularyWordManager";
import { useWordModalState } from "@/hooks/vocabulary/useWordModalState";
import { useVocabularyPlayback } from "@/hooks/vocabulary-playback";
import { useAudioInitialization } from "@/hooks/vocabulary-app/useAudioInitialization";
import { useUserInteractionHandler } from "@/hooks/vocabulary-app/useUserInteractionHandler";
import { useAutoPlayOnDataLoad } from "@/hooks/vocabulary-app/useAutoPlayOnDataLoad";
import { useUserInteractionHandlers } from "./interactive/UserInteractionHandlers";

const VocabularyAppContainer: React.FC = () => {
  // Get base vocabulary state
  const {
    hasData,
    currentWord: originalCurrentWord,
    isPaused: originalIsPaused,
    handleFileUploaded,
    jsonLoadError,
    handleSwitchCategory,
    currentCategory,
    nextCategory,
    displayTime,
    debugPanelData,
    wordList
  } = useVocabularyContainerState();

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
    playCurrentWord,
    currentWord: playbackCurrentWord,
    userInteractionRef,
    isSpeaking,
    allVoiceOptions
  } = useVocabularyPlayback(wordList || []);

  // Use our extracted hooks for audio initialization and interaction handling
  useAudioInitialization({
    userInteractionRef,
    playCurrentWord,
    playbackCurrentWord
  });
  
  useUserInteractionHandler({
    userInteractionRef,
    playCurrentWord,
    playbackCurrentWord
  });
  
  useAutoPlayOnDataLoad({
    hasData,
    wordList,
    userInteractionRef,
    playCurrentWord
  });

  // Modal state management
  const {
    isAddWordModalOpen,
    isEditMode,
    wordToEdit,
    handleOpenAddWordModal,
    handleOpenEditWordModal,
    handleCloseModal
  } = useWordModalState();

  // Use the current word from playback system as single source of truth
  const displayWord = playbackCurrentWord || originalCurrentWord;

  // Word management operations
  const wordManager = displayWord ? VocabularyWordManager({
    currentWord: displayWord,
    currentCategory,
    onWordSaved: handleCloseModal
  }) : null;

  const handleSaveWord = (wordData: { word: string; meaning: string; example: string; category: string }) => {
    if (wordManager) {
      wordManager.handleSaveWord(wordData, isEditMode, wordToEdit);
    }
  };

  // Get interaction handlers with user interaction tracking
  const {
    handleCategorySwitchDirect,
    handleManualNext,
    handleTogglePauseWithInteraction,
    handleCycleVoiceWithInteraction,
    handleToggleMuteWithInteraction
  } = useUserInteractionHandlers({
    userInteractionRef,
    goToNextWord,
    togglePause,
    cycleVoice,
    toggleMute,
    handleSwitchCategory,
    currentCategory,
    nextCategory
  });

  return (
    <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
      {/* Error display component */}
      <ErrorDisplay jsonLoadError={jsonLoadError} />

      {hasData && displayWord ? (
        <ContentWithData
          displayWord={displayWord}
          muted={muted}
          paused={paused}
          toggleMute={handleToggleMuteWithInteraction}
          handleTogglePause={handleTogglePauseWithInteraction}
          handleCycleVoice={handleCycleVoiceWithInteraction}
          handleSwitchCategory={handleCategorySwitchDirect}
          currentCategory={currentCategory}
          nextCategory={nextCategory}
          isSpeaking={isSpeaking}
          handleManualNext={handleManualNext}
          displayTime={displayTime}
          selectedVoice={selectedVoice}
          debugPanelData={debugPanelData}
          isAddWordModalOpen={isAddWordModalOpen}
          handleCloseModal={handleCloseModal}
          handleSaveWord={handleSaveWord}
          isEditMode={isEditMode}
          wordToEdit={wordToEdit}
          handleOpenAddWordModal={handleOpenAddWordModal}
          handleOpenEditWordModal={handleOpenEditWordModal}
        />
      ) : (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;
