
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
    cycleVoice,
    playCurrentWord,
    currentWord: playbackCurrentWord,
    userInteractionRef,
    isSpeaking,
    allVoiceOptions
  } = useVocabularyPlayback(wordList || []);

  // Force initialization of speech synthesis on component mount
  useEffect(() => {
    // Initialize speech synthesis and pre-load voices
    if (window.speechSynthesis) {
      // Try to force voices to load early
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log(`Voices loaded in VocabularyAppContainer: ${voices.length}`);
      };
      
      // Try to load immediately and also listen for the voiceschanged event
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      
      // Initialize speech synthesis with a silent utterance
      // This helps wake up the speech system in some browsers
      setTimeout(() => {
        try {
          const wakeupUtterance = new SpeechSynthesisUtterance('');
          wakeupUtterance.volume = 0;
          wakeupUtterance.rate = 1;
          wakeupUtterance.onend = () => console.log('Speech system initialized');
          window.speechSynthesis.speak(wakeupUtterance);
        } catch (e) {
          console.warn('Failed to initialize speech system:', e);
        }
      }, 500);
      
      // Clean up
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        window.speechSynthesis.cancel();
      };
    }
  }, []);
  
  // Simulate user interaction on first data load
  useEffect(() => {
    if (hasData && wordList && wordList.length > 0) {
      // Mark that we've had user interaction when data first loads
      userInteractionRef.current = true;
    }
  }, [hasData, wordList, userInteractionRef]);

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
  const handleCategorySwitchDirect = () => {
    // Mark that we've had user interaction
    userInteractionRef.current = true;
    
    if (typeof nextCategory === 'string') {
      console.log(`Switching directly to category: ${nextCategory}`);
      handleSwitchCategory(currentCategory, nextCategory);
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

  // Handle voice cycling with explicit user interaction
  const handleCycleVoiceWithInteraction = () => {
    // This is definitely user interaction
    userInteractionRef.current = true;
    cycleVoice();
  };

  // Handle toggle mute with explicit user interaction
  const handleToggleMuteWithInteraction = () => {
    // This is definitely user interaction
    userInteractionRef.current = true;
    toggleMute();
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
            toggleMute={handleToggleMuteWithInteraction}
            handleTogglePause={handleTogglePauseWithInteraction}
            handleCycleVoice={handleCycleVoiceWithInteraction}
            handleSwitchCategory={handleCategorySwitchDirect}
            currentCategory={currentCategory}
            nextCategory={nextCategory}
            isSoundPlaying={isSpeaking}
            handleManualNext={handleManualNext}
            displayTime={displayTime}
            selectedVoice={selectedVoice}
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
