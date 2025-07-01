
import React, { useMemo } from "react";
import VocabularyLayout from "@/components/VocabularyLayout";
import ErrorDisplay from "./ErrorDisplay";
import ContentWithDataNew from "./ContentWithDataNew";
import VocabularyCardNew from "./VocabularyCardNew";
import AudioStatusIndicator from "./AudioStatusIndicator";
import UserInteractionManager from "./UserInteractionManager";
import { useWordModalState } from "@/hooks/vocabulary/useWordModalState";
import { useStableVocabularyState } from "@/hooks/vocabulary-app/useStableVocabularyState";
import { useOptimizedAutoPlay } from "@/hooks/vocabulary-app/useOptimizedAutoPlay";
import VocabularyWordManager from "./word-management/VocabularyWordManager";
import { vocabularyService } from '@/services/vocabularyService';

const VocabularyAppContainerNew: React.FC = () => {
  // Use stable state management
  const {
    currentWord,
    hasData,
    currentCategory,
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking,
    goToNext,
    togglePause,
    toggleMute,
    toggleVoice,
    switchCategory,
    playCurrentWord,
    userInteractionState,
    nextVoiceLabel,
    nextCategory,
    handleInteractionUpdate
  } = useStableVocabularyState();

  // Optimized auto-play with reduced re-renders
  useOptimizedAutoPlay({
    hasData,
    currentWord,
    hasInitialized: userInteractionState.hasInitialized,
    isPaused,
    isMuted,
    isSpeaking,
    isAudioUnlocked: userInteractionState.isAudioUnlocked,
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

  // Memoize word manager to prevent recreation
  const wordManager = useMemo(() => {
    return currentWord ? VocabularyWordManager({
      currentWord,
      currentCategory,
      onWordSaved: handleCloseModal
    }) : null;
  }, [currentWord?.word, currentCategory, handleCloseModal]);

  const handleSaveWord = React.useCallback((wordData: { word: string; meaning: string; example: string; category: string }) => {
    if (wordManager) {
      wordManager.handleSaveWord(wordData, isEditMode, wordToEdit);
    }
  }, [wordManager, isEditMode, wordToEdit]);

  // Memoize debug data
  const debugData = useMemo(() => {
    return currentWord
      ? { word: currentWord.word, category: currentWord.category || currentCategory }
      : null;
  }, [currentWord?.word, currentWord?.category, currentCategory]);

  let content: React.ReactNode;

  if (!hasData && !vocabularyService.hasData()) {
    return (
      <VocabularyLayout showWordCard={true} hasData={false} onToggleView={() => {}}>
        <div className="space-y-4">
          <UserInteractionManager
            currentWord={currentWord}
            playCurrentWord={playCurrentWord}
            onInteractionUpdate={handleInteractionUpdate}
          />
          <AudioStatusIndicator
            isAudioUnlocked={userInteractionState.isAudioUnlocked}
            hasInitialized={userInteractionState.hasInitialized}
          />
          <VocabularyCardNew
            word="No vocabulary data"
            meaning="Please upload a vocabulary file to get started"
            example=""
            backgroundColor="#F0F8FF"
            isMuted={isMuted}
            isPaused={isPaused}
            onToggleMute={toggleMute}
            onTogglePause={togglePause}
            onCycleVoice={toggleVoice}
            onSwitchCategory={switchCategory}
            onNextWord={goToNext}
            currentCategory={currentCategory}
            nextCategory={nextCategory}
            isSpeaking={false}
            category="No Data"
            voiceRegion={voiceRegion}
            nextVoiceLabel={nextVoiceLabel}
          />
        </div>
        </VocabularyLayout>
      );
  }

  if (!hasData) {
    return (
      <VocabularyLayout showWordCard={true} hasData={false} onToggleView={() => {}}>
        <div className="space-y-4">
          <UserInteractionManager
            currentWord={currentWord}
            playCurrentWord={playCurrentWord}
            onInteractionUpdate={handleInteractionUpdate}
          />
          <AudioStatusIndicator
            isAudioUnlocked={userInteractionState.isAudioUnlocked}
            hasInitialized={userInteractionState.hasInitialized}
          />
          <VocabularyCardNew
            word={`No words in "${currentCategory}" category`}
            meaning="Try switching to another category"
            example=""
            backgroundColor="#F0F8FF"
            isMuted={isMuted}
            isPaused={isPaused}
            onToggleMute={toggleMute}
            onTogglePause={togglePause}
            onCycleVoice={toggleVoice}
            onSwitchCategory={switchCategory}
            onNextWord={goToNext}
            currentCategory={currentCategory}
            nextCategory={nextCategory}
            isSpeaking={false}
            category={currentCategory}
            voiceRegion={voiceRegion}
            nextVoiceLabel={nextVoiceLabel}
          />
        </div>
        </VocabularyLayout>
      );
  }

  if (!currentWord) {
    return (
      <VocabularyLayout showWordCard={true} hasData={true} onToggleView={() => {}}>
        <div className="space-y-4">
          <UserInteractionManager
            currentWord={currentWord}
            playCurrentWord={playCurrentWord}
            onInteractionUpdate={handleInteractionUpdate}
          />
        <AudioStatusIndicator
          isAudioUnlocked={userInteractionState.isAudioUnlocked}
          hasInitialized={userInteractionState.hasInitialized}
        />
          <VocabularyCardNew
            word="Loading vocabulary..."
            meaning="Please wait while we load your vocabulary data"
            example=""
            backgroundColor="#F0F8FF"
            isMuted={isMuted}
            isPaused={isPaused}
            onToggleMute={toggleMute}
            onTogglePause={togglePause}
            onCycleVoice={toggleVoice}
            onSwitchCategory={switchCategory}
            onNextWord={goToNext}
            currentCategory={currentCategory}
            nextCategory={nextCategory}
            isSpeaking={false}
            category="Loading"
            voiceRegion={voiceRegion}
            nextVoiceLabel={nextVoiceLabel}
          />
        </div>
      </VocabularyLayout>
      );
  } else {
    content = (
      <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
        <div className="space-y-4">
          <UserInteractionManager
            currentWord={currentWord}
            playCurrentWord={playCurrentWord}
            onInteractionUpdate={handleInteractionUpdate}
          />

        <AudioStatusIndicator
          isAudioUnlocked={userInteractionState.isAudioUnlocked}
          hasInitialized={userInteractionState.hasInitialized}
        />

          <ErrorDisplay jsonLoadError={false} />

          <ContentWithDataNew
            displayWord={currentWord}
            muted={isMuted}
            paused={isPaused}
            toggleMute={toggleMute}
            handleTogglePause={togglePause}
            handleCycleVoice={toggleVoice}
            nextVoiceLabel={nextVoiceLabel}
            handleSwitchCategory={switchCategory}
            currentCategory={currentCategory}
            nextCategory={nextCategory}
            isSpeaking={isSpeaking}
            handleManualNext={goToNext}
            displayTime={5000}
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
        </div>
      </VocabularyLayout>
    );
  }

  return (
    <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
      <div className="space-y-4">
        <UserInteractionManager
          currentWord={currentWord}
          playCurrentWord={playCurrentWord}
          onInteractionUpdate={handleInteractionUpdate}
        />
        
        <AudioStatusIndicator
          isAudioUnlocked={userInteractionState.isAudioUnlocked}
          hasInitialized={userInteractionState.hasInitialized}
        />
        
        <ErrorDisplay jsonLoadError={false} />
        
        <ContentWithDataNew
          displayWord={currentWord}
          muted={isMuted}
          paused={isPaused}
          toggleMute={toggleMute}
          handleTogglePause={togglePause}
          handleCycleVoice={toggleVoice}
          nextVoiceLabel={nextVoiceLabel}
          handleSwitchCategory={switchCategory}
          currentCategory={currentCategory}
          nextCategory={nextCategory}
          isSpeaking={isSpeaking}
          handleManualNext={goToNext}
          displayTime={5000}
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
      </div>
    </VocabularyLayout>
  );
};

export default VocabularyAppContainerNew;
