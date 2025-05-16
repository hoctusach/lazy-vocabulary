
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
import { useVocabularyPlayback } from "@/hooks/vocabulary-playback";

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
    changeVoice,
    playCurrentWord,
    currentWord: playbackCurrentWord, // This is the single source of truth
    userInteractionRef
  } = useVocabularyPlayback(wordList || []);

  // Force initialization of speech synthesis on component mount
  useEffect(() => {
    if (window.speechSynthesis) {
      // Just accessing this property ensures it's initialized
      const voices = window.speechSynthesis.getVoices();
      console.log(`Initial voices load: ${voices.length} voices available`);
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

  // Direct category switch handler - with explicit user interaction tracking
  const handleCategorySwitchDirect = (categoryName?: string) => {
    // Mark that we've had user interaction
    userInteractionRef.current = true;
    
    // Fixed: Ensure we're passing a string, not an object
    const targetCategory = typeof categoryName === 'string' ? categoryName : nextCategory;
    if (targetCategory) {
      console.log(`Switching directly to category: ${targetCategory}`);
      handleSwitchCategory(currentCategory, targetCategory);
    }
  };

  // Handle manual next with explicit user interaction
  const handleManualNext = () => {
    // This is definitely user interaction
    userInteractionRef.current = true;
    goToNextWord();
  };

  // Handle toggle pause with explicit user interaction
  const handleTogglePauseWithInteraction = () => {
    // This is definitely user interaction
    userInteractionRef.current = true;
    togglePause();
  };

  // Handle voice change with explicit user interaction
  const handleChangeVoiceWithInteraction = (voiceRegion: 'US' | 'UK') => {
    // This is definitely user interaction
    userInteractionRef.current = true;
    changeVoice(voiceRegion);
  };

  // Create correctly formatted voice options for the component
  const formattedVoiceOptions = voices.map(voice => ({
    label: voice.label,
    region: voice.region as 'US' | 'UK',
    gender: 'female' as 'male' | 'female', // Default to female for now
    voice: null  // We don't need to pass the actual voice object
  }));

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
            voiceOptions={formattedVoiceOptions}
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
