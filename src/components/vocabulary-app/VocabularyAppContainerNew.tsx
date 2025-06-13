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
import { mobileAudioManager } from '@/utils/audio/mobileAudioManager';

const VocabularyAppContainerNew: React.FC = () => {
  console.log('[VOCAB-CONTAINER-NEW] === Component Render ===');
  
  // Track whether the user has interacted to enable audio playback
  const userInteractionRef = useRef(false);
  const [hasUserInteracted, setHasUserInteracted] = React.useState(false);
  const interactionCountRef = useRef(0);

  React.useEffect(() => {
    if (localStorage.getItem('hadUserInteraction') === 'true') {
      setHasUserInteracted(true);
      userInteractionRef.current = true;
      console.log('[VOCAB-CONTAINER-NEW] ✓ Previous user interaction detected from localStorage');
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

  // Enhanced user interaction handler with comprehensive audio setup
  const handleUserInteraction = React.useCallback(async () => {
    interactionCountRef.current++;
    console.log(`[USER-INTERACTION] Interaction #${interactionCountRef.current} detected`);

    if (!userInteractionRef.current) {
      console.log('[USER-INTERACTION] ✓ First user interaction - initializing audio systems');
      userInteractionRef.current = true;
      setHasUserInteracted(true);
      localStorage.setItem('hadUserInteraction', 'true');
      
      // Initialize mobile audio manager
      const audioInitialized = await mobileAudioManager.initialize();
      console.log('[USER-INTERACTION] Mobile audio manager initialized:', audioInitialized);
      
      // Initialize audio context with comprehensive fallbacks
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const audioContext = new AudioContext();
          console.log('[USER-INTERACTION] AudioContext state:', audioContext.state);
          
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
            console.log('[USER-INTERACTION] ✓ AudioContext resumed');
          }
        }
      } catch (e) {
        console.warn('[USER-INTERACTION] ⚠ Audio context initialization failed:', e);
      }
      
      // Play current word if available and conditions are met
      if (currentWord && !isPaused && !isMuted) {
        console.log('[USER-INTERACTION] Starting initial audio playback');
        setTimeout(() => {
          playCurrentWord();
        }, 300);
      } else {
        console.log('[USER-INTERACTION] Not starting audio:', {
          hasCurrentWord: !!currentWord,
          isPaused,
          isMuted
        });
      }
    } else {
      // Resume audio context on subsequent interactions
      try {
        await mobileAudioManager.resume();
        console.log(`[USER-INTERACTION] Interaction #${interactionCountRef.current} - audio context resumed`);
      } catch (e) {
        console.warn('[USER-INTERACTION] Failed to resume audio:', e);
      }
    }
  }, [currentWord, isPaused, isMuted, playCurrentWord]);

  // Desktop interaction handler with logging
  useEffect(() => {
    const handleClick = (e: Event) => {
      console.log('[USER-INTERACTION] Click event detected on:', e.target);
      handleUserInteraction();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('[USER-INTERACTION] Keydown event detected:', e.key);
      handleUserInteraction();
    };

    // Add event listeners for user interaction
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUserInteraction]);

  // Enhanced mobile interaction handler
  const mobileHandler = useMobileInteractionHandler(handleUserInteraction);
  console.log('[VOCAB-CONTAINER-NEW] Mobile interaction state:', mobileHandler);

  // Auto-play when data loads and user has interacted
  useEffect(() => {
    if (hasData && currentWord && hasUserInteracted && !isPaused && !isMuted && !isSpeaking) {
      console.log('[AUTO-PLAY] ✓ All conditions met - playing word on data load');
      setTimeout(() => {
        playCurrentWord();
      }, 500);
    } else {
      console.log('[AUTO-PLAY] Conditions not met:', {
        hasData,
        hasCurrentWord: !!currentWord,
        hasUserInteracted,
        isPaused,
        isMuted,
        isSpeaking
      });
    }
  }, [hasData, currentWord, hasUserInteracted, isPaused, isMuted, isSpeaking, playCurrentWord]);

  // Log state changes for debugging
  useEffect(() => {
    console.log('[VOCAB-CONTAINER-NEW] State change - isPaused:', isPaused);
  }, [isPaused]);

  useEffect(() => {
    console.log('[VOCAB-CONTAINER-NEW] State change - isMuted:', isMuted);
  }, [isMuted]);

  useEffect(() => {
    console.log('[VOCAB-CONTAINER-NEW] State change - isSpeaking:', isSpeaking);
  }, [isSpeaking]);

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
