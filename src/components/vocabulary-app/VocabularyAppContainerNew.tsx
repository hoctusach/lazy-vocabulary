
import React, { useRef, useEffect } from "react";
import VocabularyLayout from "@/components/VocabularyLayout";
import ErrorDisplay from "./ErrorDisplay";
import ContentWithDataNew from "./ContentWithDataNew";
import VocabularyCardNew from "./VocabularyCardNew";
import { useWordModalState } from "@/hooks/vocabulary/useWordModalState";
import { useUnifiedVocabularyController } from '@/hooks/vocabulary-controller/useUnifiedVocabularyController';
import { useMobileInteractionHandler } from '@/hooks/vocabulary-app/useMobileInteractionHandler';
import VocabularyWordManager from "./word-management/VocabularyWordManager";
import { vocabularyService } from '@/services/vocabularyService';

const VocabularyAppContainerNew: React.FC = () => {
  console.log('[VOCAB-CONTAINER-NEW] === Component Render ===');
  
  // Track whether the user has interacted to enable audio playback
  const userInteractionRef = useRef(false);
  const [hasUserInteracted, setHasUserInteracted] = React.useState(false);

  React.useEffect(() => {
    if (localStorage.getItem('hadUserInteraction') === 'true') {
      setHasUserInteracted(true);
      userInteractionRef.current = true;
    }
  }, []);

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

  // User interaction handlers - both desktop and mobile
  const handleUserInteraction = React.useCallback(() => {
    if (!userInteractionRef.current) {
      console.log('[USER-INTERACTION] First user interaction detected');
      userInteractionRef.current = true;
      setHasUserInteracted(true);
      localStorage.setItem('hadUserInteraction', 'true');
      
      // Initialize audio context
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const audioContext = new AudioContext();
          if (audioContext.state === 'suspended') {
            audioContext.resume();
          }
        }
      } catch (e) {
        console.warn('[USER-INTERACTION] Audio context initialization failed:', e);
      }
      
      // Play current word if available and not muted/paused
      if (currentWord && !isPaused && !isMuted) {
        setTimeout(() => {
          playCurrentWord();
        }, 300);
      }
    }
  }, [currentWord, isPaused, isMuted, playCurrentWord]);

  // Desktop interaction handler
  useEffect(() => {
    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [handleUserInteraction]);

  // Mobile interaction handler
  useMobileInteractionHandler(handleUserInteraction);

  // Auto-play when data loads and user has interacted
  useEffect(() => {
    if (hasData && currentWord && hasUserInteracted && !isPaused && !isMuted && !isSpeaking) {
      console.log('[AUTO-PLAY] Playing word on data load');
      setTimeout(() => {
        playCurrentWord();
      }, 500);
    }
  }, [hasData, currentWord, hasUserInteracted, isPaused, isMuted, isSpeaking, playCurrentWord]);

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
