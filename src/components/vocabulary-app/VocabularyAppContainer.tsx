
import React, { useEffect } from "react";
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
    playCurrentWord,
    currentWord: playbackCurrentWord, // This is the single source of truth
    userInteractionRef
  } = useVocabularyPlayback(wordList || []);

  // Force initialization of speech synthesis
  useEffect(() => {
    if (window.speechSynthesis) {
      // Just accessing this property ensures it's initialized
      window.speechSynthesis.getVoices();
    }
  }, []);

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
    // Mark that we've had user interaction
    if (userInteractionRef) {
      userInteractionRef.current = true;
    }
    
    const targetCategory = categoryName || nextCategory;
    if (targetCategory) {
      console.log(`Switching directly to category: ${targetCategory}`);
      handleSwitchCategory(currentCategory, targetCategory);
    }
  };

  // Handle manual next - ensure user interaction is recorded
  const handleManualNext = () => {
    // This is definitely user interaction
    if (userInteractionRef) {
      userInteractionRef.current = true;
    }
    goToNextWord();
  };

  // Handle toggle pause - ensure user interaction is recorded
  const handleTogglePauseWithInteraction = () => {
    // This is definitely user interaction
    if (userInteractionRef) {
      userInteractionRef.current = true;
    }
    togglePause();
  };

  // Handle voice change - ensure user interaction is recorded
  const handleChangeVoiceWithInteraction = (voiceRegion: 'US' | 'UK') => {
    // This is definitely user interaction
    if (userInteractionRef) {
      userInteractionRef.current = true;
    }
    changeVoice(voiceRegion);
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
            handleTogglePause={handleTogglePauseWithInteraction}
            handleChangeVoice={handleChangeVoiceWithInteraction}
            handleSwitchCategory={handleCategorySwitchDirect}
            currentCategory={currentCategory}
            nextCategory={nextCategory}
            isSoundPlaying={!muted && !paused}
            handleManualNext={handleManualNext}
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
