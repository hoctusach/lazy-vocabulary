
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
  console.log('[VOCAB-CONTAINER] === Component Render ===');
  
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
    wordList
  } = useVocabularyContainerState();

  console.log('[VOCAB-CONTAINER] Container state:', {
    hasData,
    originalCurrentWord: originalCurrentWord?.word,
    wordListLength: wordList?.length || 0,
    currentCategory
  });

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

  console.log('[VOCAB-CONTAINER] Playback state:', {
    playbackCurrentWord: playbackCurrentWord?.word,
    muted,
    paused,
    isSpeaking
  });

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
  // But add fallback logic for better reliability
  const displayWord = (() => {
    console.log('[VOCAB-CONTAINER] Determining display word:', {
      playbackCurrentWord: playbackCurrentWord?.word,
      originalCurrentWord: originalCurrentWord?.word,
      hasData,
      wordListLength: wordList?.length || 0
    });
    
    if (playbackCurrentWord) {
      console.log('[VOCAB-CONTAINER] Using playback current word:', playbackCurrentWord.word);
      return playbackCurrentWord;
    }
    
    if (originalCurrentWord) {
      console.log('[VOCAB-CONTAINER] Falling back to original current word:', originalCurrentWord.word);
      return originalCurrentWord;
    }
    
    // Final fallback - use first word from list if available
    if (wordList && wordList.length > 0) {
      console.log('[VOCAB-CONTAINER] Using first word from list as fallback:', wordList[0].word);
      return wordList[0];
    }
    
    console.log('[VOCAB-CONTAINER] No display word available');
    return null;
  })();

  console.log('[VOCAB-CONTAINER] Final display word:', displayWord?.word);

  // Derive debug data from the word currently displayed
  const debugData = displayWord
    ? { word: displayWord.word, category: displayWord.category || currentCategory }
    : null;

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
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;
