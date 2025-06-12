
import React from "react";
import VocabularyLayout from "@/components/VocabularyLayout";
import VocabularyWordManager from "./word-management/VocabularyWordManager";
import { useAudioInitialization } from "@/hooks/vocabulary-app/useAudioInitialization";
import { useUserInteractionHandler } from "@/hooks/vocabulary-app/useUserInteractionHandler";
import { useAutoPlayOnDataLoad } from "@/hooks/vocabulary-app/useAutoPlayOnDataLoad";
import { useUserInteractionHandlers } from "./interactive/UserInteractionHandlers";
import { useVocabularyAppState } from "./hooks/useVocabularyAppState";
import { useDisplayWord } from "./hooks/useDisplayWord";
import { useVoiceLabels } from "./hooks/useVoiceLabels";
import VocabularyAppContent from "./components/VocabularyAppContent";

const VocabularyAppContainer: React.FC = () => {
  console.log('[VOCAB-CONTAINER] === Component Render ===');
  
  // Get all app state
  const {
    hasData,
    hasAnyData,
    handleFileUploaded,
    jsonLoadError,
    handleSwitchCategory,
    currentCategory,
    nextCategory,
    displayTime,
    wordList,
    muted,
    paused,
    selectedVoice,
    toggleMute,
    togglePause,
    goToNextWord,
    cycleVoice,
    playCurrentWord,
    playbackCurrentWord,
    userInteractionRef,
    isSpeaking,
    isAddWordModalOpen,
    isEditMode,
    wordToEdit,
    handleOpenAddWordModal,
    handleOpenEditWordModal,
    handleCloseModal
  } = useVocabularyAppState();

  console.log('[VOCAB-CONTAINER] Container state:', {
    hasData,
    hasAnyData,
    wordListLength: wordList?.length || 0,
    currentCategory
  });

  console.log('[VOCAB-CONTAINER] Playback state:', {
    playbackCurrentWord: playbackCurrentWord?.word,
    muted,
    paused,
    isSpeaking
  });

  // Determine display word with fallback logic
  const { displayWord, debugData } = useDisplayWord(playbackCurrentWord, wordList || [], hasData);

  // Get voice labels
  const { nextVoiceLabel } = useVoiceLabels(selectedVoice);

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
    currentWord: playbackCurrentWord,
    userInteractionRef,
    playCurrentWord
  });

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
      <VocabularyAppContent
        hasData={hasData}
        hasAnyData={hasAnyData}
        displayWord={displayWord}
        jsonLoadError={jsonLoadError}
        muted={muted}
        paused={paused}
        isSpeaking={isSpeaking}
        selectedVoice={selectedVoice}
        nextVoiceLabel={nextVoiceLabel}
        currentCategory={currentCategory}
        nextCategory={nextCategory}
        displayTime={displayTime}
        debugData={debugData}
        isAddWordModalOpen={isAddWordModalOpen}
        isEditMode={isEditMode}
        wordToEdit={wordToEdit}
        handleToggleMuteWithInteraction={handleToggleMuteWithInteraction}
        handleTogglePauseWithInteraction={handleTogglePauseWithInteraction}
        handleCycleVoiceWithInteraction={handleCycleVoiceWithInteraction}
        handleCategorySwitchDirect={handleCategorySwitchDirect}
        handleManualNext={handleManualNext}
        handleCloseModal={handleCloseModal}
        handleSaveWord={handleSaveWord}
        handleOpenAddWordModal={handleOpenAddWordModal}
        handleOpenEditWordModal={handleOpenEditWordModal}
      />
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;
