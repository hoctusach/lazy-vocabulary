
import React from "react";
import VocabularyLayout from "@/components/VocabularyLayout";
import WelcomeScreen from "@/components/WelcomeScreen";
import ErrorDisplay from "./ErrorDisplay";
import ContentWithDataNew from "./ContentWithDataNew";
import { useVocabularyContainerState } from "@/hooks/vocabulary/useVocabularyContainerState";
import { useWordModalState } from "@/hooks/vocabulary/useWordModalState";
import { useVocabularyController } from "@/hooks/vocabulary-controller/useVocabularyController";
import VocabularyWordManager from "./word-management/VocabularyWordManager";

const VocabularyAppContainerNew: React.FC = () => {
  console.log('[VOCAB-CONTAINER-NEW] === Component Render ===');
  
  // Get base vocabulary state (file handling, categories, etc.)
  const {
    hasData,
    handleFileUploaded,
    jsonLoadError,
    handleSwitchCategory,
    currentCategory,
    nextCategory,
    displayTime,
    wordList
  } = useVocabularyContainerState();

  console.log('[VOCAB-CONTAINER-NEW] Container state:', {
    hasData,
    wordListLength: wordList?.length || 0,
    currentCategory
  });

  // Use our unified vocabulary controller with the correct signature (only wordList)
  const {
    currentWord,
    currentIndex,
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking,
    goToNext,
    goToPrevious,
    togglePause,
    toggleMute,
    toggleVoice,
    playCurrentWord,
    wordCount
  } = useVocabularyController(wordList || []);

  console.log('[VOCAB-CONTAINER-NEW] Controller state:', {
    currentWord: currentWord?.word,
    currentIndex,
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking
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

  // Word management operations
  const wordManager = currentWord ? VocabularyWordManager({
    currentWord,
    currentCategory,
    onWordSaved: handleCloseModal
  }) : null;

  const handleSaveWord = (wordData: { word: string; meaning: string; example: string; category: string }) => {
    if (wordManager) {
      wordManager.handleSaveWord(wordData, isEditMode, wordToEdit);
    }
  };

  // Enhanced button handlers with user interaction tracking
  const handleManualNext = () => {
    console.log('[VOCAB-CONTAINER-NEW] Manual next button clicked');
    goToNext();
  };

  const handleSwitchCategoryWithState = () => {
    console.log('[VOCAB-CONTAINER-NEW] Category switch button clicked');
    handleSwitchCategory();
  };

  // Debug data for the debug panel
  const debugData = currentWord
    ? { word: currentWord.word, category: currentWord.category || currentCategory }
    : null;

  // Create a wrapper function for file upload to match WelcomeScreen's expected signature
  const handleFileUploadWrapper = () => {
    // This is a no-op since WelcomeScreen will handle file selection internally
    // The actual file processing will be handled by the FileUpload component
  };

  return (
    <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
      {/* Error display component - fix type mismatch by converting string to boolean */}
      <ErrorDisplay jsonLoadError={!!jsonLoadError} />

      {hasData && currentWord ? (
        <ContentWithDataNew
          displayWord={currentWord}
          muted={isMuted}
          paused={isPaused}
          toggleMute={toggleMute}
          handleTogglePause={togglePause}
          handleCycleVoice={toggleVoice}
          handleSwitchCategory={handleSwitchCategoryWithState}
          currentCategory={currentCategory}
          nextCategory={nextCategory}
          isSpeaking={isSpeaking}
          handleManualNext={handleManualNext}
          displayTime={displayTime}
          voiceRegion={voiceRegion}
          debugPanelData={debugData}
          isAddWordModalOpen={isAddWordModalOpen}
          handleCloseModal={handleCloseModal}
          handleSaveWord={handleSaveWord}
          isEditMode={isEditMode}
          wordToEdit={wordToEdit}
          handleOpenAddWordModal={handleOpenAddWordModal}
          handleOpenEditWordModal={handleOpenEditWordModal}
        />
      ) : (
        <WelcomeScreen onFileUploaded={handleFileUploadWrapper} />
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainerNew;
