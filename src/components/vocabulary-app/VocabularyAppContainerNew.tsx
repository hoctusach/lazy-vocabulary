
import React, { useRef } from "react";
import VocabularyLayout from "@/components/VocabularyLayout";
import ErrorDisplay from "./ErrorDisplay";
import ContentWithDataNew from "./ContentWithDataNew";
import VocabularyCardNew from "./VocabularyCardNew";
import { useVocabularyContainerState } from "@/hooks/vocabulary/useVocabularyContainerState";
import { useWordModalState } from "@/hooks/vocabulary/useWordModalState";
import { useUnifiedVocabularyController } from '@/hooks/vocabulary-controller/useUnifiedVocabularyController';
import VocabularyWordManager from "./word-management/VocabularyWordManager";
import { useUserInteractionHandler } from "@/hooks/vocabulary-app/useUserInteractionHandler";
import { useAutoPlayOnDataLoad } from "@/hooks/vocabulary-app/useAutoPlayOnDataLoad";
import { useAudioInitialization } from "@/hooks/vocabulary-app/useAudioInitialization";

const VocabularyAppContainerNew: React.FC = () => {
  console.log('[VOCAB-CONTAINER-NEW] === Component Render ===');
  
  // Get base vocabulary state (file handling, categories, etc.)
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

  // Track whether the user has interacted to enable audio playback
  const userInteractionRef = useRef(false);

  console.log('[VOCAB-CONTAINER-NEW] Container state:', {
    hasData,
    hasAnyData,
    currentCategory
  });

  // Use ONLY the unified vocabulary controller - no more dual controller architecture
  const {
    currentWord,
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking,
    goToNext,
    togglePause,
    toggleMute,
    toggleVoice,
    playCurrentWord,
    hasData: controllerHasData
  } = useUnifiedVocabularyController();

  // Initialize speech synthesis and user interaction handling
  useAudioInitialization({
    userInteractionRef,
    playCurrentWord,
    playbackCurrentWord: currentWord,
  });

  useUserInteractionHandler({
    userInteractionRef,
    playCurrentWord,
    playbackCurrentWord: currentWord,
  });

  useAutoPlayOnDataLoad({
    hasData,
    currentWord,
    userInteractionRef,
    playCurrentWord,
  });

  const nextVoiceLabel =
    voiceRegion === 'UK' ? 'US' : voiceRegion === 'US' ? 'AU' : 'US';

  console.log('[VOCAB-CONTAINER-NEW] Unified controller state:', {
    currentWord: currentWord?.word,
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking,
    controllerHasData
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

  return (
    <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
      {/* Error display component */}
      <ErrorDisplay jsonLoadError={!!jsonLoadError} />

      {hasData && currentWord ? (
        <ContentWithDataNew
          displayWord={currentWord}
          muted={isMuted}
          paused={isPaused}
          toggleMute={toggleMute}
          handleTogglePause={togglePause}
          handleCycleVoice={toggleVoice}
          nextVoiceLabel={nextVoiceLabel}
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
      ) : hasAnyData ? (
        <VocabularyCardNew
          word="No data for this category"
          meaning=""
          example=""
          backgroundColor="#F0F8FF"
          isMuted={isMuted}
          isPaused={isPaused}
          onToggleMute={toggleMute}
          onTogglePause={togglePause}
          onCycleVoice={toggleVoice}
          onSwitchCategory={handleSwitchCategoryWithState}
          onNextWord={() => {}}
          currentCategory={currentCategory}
          nextCategory={nextCategory || 'Next'}
          isSpeaking={false}
          category={currentCategory}
          voiceRegion={voiceRegion}
          nextVoiceLabel={nextVoiceLabel}
        />
      ) : (
        <p>Loading vocabulary…</p>
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainerNew;
