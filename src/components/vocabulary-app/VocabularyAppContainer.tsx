
import React from "react";
import VocabularyLayout from "@/components/VocabularyLayout";
import WelcomeScreen from "@/components/WelcomeScreen";
import AddWordModal from "./AddWordModal";
import DebugPanel from "@/components/DebugPanel";
import ErrorDisplay from "./ErrorDisplay";
import VocabularyMain from "./VocabularyMain";
import WordActionButtons from "./WordActionButtons";
import { useVocabularyContainerState } from "@/hooks/vocabulary/useVocabularyContainerState";
import VocabularyWordManager from "./word-management/VocabularyWordManager";
import { useWordModalState } from "@/hooks/vocabulary/useWordModalState";
import { useVocabularyPlayback } from "@/hooks/useVocabularyPlayback";

const VocabularyAppContainer: React.FC = () => {
  // Get base vocabulary state
  const {
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    jsonLoadError,
    handleSwitchCategory,
    currentCategory,
    nextCategory,
    displayTime,
    debugPanelData,
    wordList
  } = useVocabularyContainerState();

  // Use our playback hook for all speech functionality
  const {
    muted,
    paused,
    voices,
    selectedVoice,
    toggleMute,
    togglePause,
    goToNextWord,
    changeVoice,
    currentWord: playbackCurrentWord // This is the single source of truth
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

  // Use the current word from playback system as single source of truth
  const displayWord = playbackCurrentWord || currentWord;

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

  // Direct category switch handler
  const handleCategorySwitchDirect = (categoryName?: string) => {
    const targetCategory = categoryName || nextCategory;
    if (targetCategory) {
      console.log(`Switching directly to category: ${targetCategory}`);
      handleSwitchCategory(currentCategory, targetCategory);
    }
  };

  return (
    <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
      {/* Error display component */}
      <ErrorDisplay jsonLoadError={jsonLoadError} />

      {hasData && displayWord ? (
        <>
          {/* Main vocabulary display */}
          <VocabularyMain
            currentWord={displayWord}
            mute={muted}
            isPaused={paused}
            toggleMute={toggleMute}
            handleTogglePause={togglePause}
            handleChangeVoice={changeVoice}
            handleSwitchCategory={handleCategorySwitchDirect}
            currentCategory={currentCategory}
            nextCategory={nextCategory}
            isSoundPlaying={!muted && !paused}
            handleManualNext={goToNextWord}
            displayTime={displayTime}
            voiceOptions={voices}
            selectedVoice={selectedVoice.region}
          />
          
          {/* Action buttons container */}
          <WordActionButtons 
            currentWord={displayWord}
            onOpenAddModal={handleOpenAddWordModal}
            onOpenEditModal={() => handleOpenEditWordModal(displayWord)}
          />
          
          {/* Debug Panel */}
          <DebugPanel 
            isMuted={muted}
            voiceRegion={selectedVoice.region}
            isPaused={paused}
            currentWord={debugPanelData}
          />
          
          {/* Enhanced Word Modal (handles both add and edit) */}
          <AddWordModal 
            isOpen={isAddWordModalOpen} 
            onClose={handleCloseModal} 
            onSave={handleSaveWord}
            editMode={isEditMode}
            wordToEdit={isEditMode && wordToEdit ? {
              word: wordToEdit.word,
              meaning: wordToEdit.meaning,
              example: wordToEdit.example,
              category: wordToEdit.category || currentCategory
            } : undefined}
          />
        </>
      ) : (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;
