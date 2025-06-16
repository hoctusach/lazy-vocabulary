
import React, { useRef, useEffect } from "react";
import VocabularyLayout from "@/components/VocabularyLayout";
import ErrorDisplay from "./ErrorDisplay";
import ContentWithDataNew from "./ContentWithDataNew";
import VocabularyCardNew from "./VocabularyCardNew";
import { useWordModalState } from "@/hooks/vocabulary/useWordModalState";
import { useUnifiedVocabularyController } from '@/hooks/vocabulary-controller/useUnifiedVocabularyController';
import { useEnhancedUserInteraction } from '@/hooks/vocabulary-app/useEnhancedUserInteraction';
import VocabularyWordManager from "./word-management/VocabularyWordManager";
import { vocabularyService } from '@/services/vocabularyService';

const VocabularyAppContainerNew: React.FC = () => {
  console.log('[VOCAB-CONTAINER-NEW] === Component Render ===');
  
  // Use ONLY the unified vocabulary controller - single source of truth
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
    playCurrentWord
  } = useUnifiedVocabularyController();

  console.log('[VOCAB-CONTAINER-NEW] Unified controller state:', {
    currentWord: currentWord?.word,
    hasData,
    currentCategory,
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking
  });

  // Enhanced user interaction handling with proper audio unlock
  const { hasInitialized, interactionCount, isAudioUnlocked } = useEnhancedUserInteraction({
    onUserInteraction: () => {
      console.log('[VOCAB-CONTAINER-NEW] User interaction callback triggered');
    },
    currentWord,
    playCurrentWord
  });

  console.log('[VOCAB-CONTAINER-NEW] User interaction state:', {
    hasInitialized,
    interactionCount,
    isAudioUnlocked
  });

  // Auto-play when conditions are met (simplified logic)
  useEffect(() => {
    if (hasData && currentWord && hasInitialized && !isPaused && !isMuted && !isSpeaking && isAudioUnlocked) {
      console.log('[AUTO-PLAY] ✓ All conditions met - scheduling word playback');
      const timeoutId = setTimeout(() => {
        if (!isPaused && !isMuted && !isSpeaking) {
          console.log('[AUTO-PLAY] Executing delayed word playback');
          playCurrentWord();
        }
      }, 600);

      return () => clearTimeout(timeoutId);
    } else {
      console.log('[AUTO-PLAY] Conditions not met:', {
        hasData,
        hasCurrentWord: !!currentWord,
        hasInitialized,
        isPaused,
        isMuted,
        isSpeaking,
        isAudioUnlocked
      });
    }
  }, [hasData, currentWord, hasInitialized, isPaused, isMuted, isSpeaking, isAudioUnlocked, playCurrentWord]);

  const nextVoiceLabel =
    voiceRegion === 'UK' ? 'US' : voiceRegion === 'US' ? 'AU' : 'UK';

  // Get next category for display
  const getNextCategory = () => {
    const sheets = vocabularyService.getAllSheetNames();
    const currentIndex = sheets.indexOf(currentCategory);
    const nextIndex = (currentIndex + 1) % sheets.length;
    return sheets[nextIndex] || 'Next';
  };

  const nextCategory = getNextCategory();

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

  // Debug data for the debug panel
  const debugData = currentWord
    ? { word: currentWord.word, category: currentWord.category || currentCategory }
    : null;

  // Show different states based on data availability
  if (!hasData && !vocabularyService.hasData()) {
    return (
      <VocabularyLayout showWordCard={true} hasData={false} onToggleView={() => {}}>
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
      </VocabularyLayout>
    );
  }

  if (!hasData) {
    return (
      <VocabularyLayout showWordCard={true} hasData={false} onToggleView={() => {}}>
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
      </VocabularyLayout>
    );
  }

  if (!currentWord) {
    return (
      <VocabularyLayout showWordCard={true} hasData={true} onToggleView={() => {}}>
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
      </VocabularyLayout>
    );
  }

  return (
    <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
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
    </VocabularyLayout>
  );
};

export default VocabularyAppContainerNew;
