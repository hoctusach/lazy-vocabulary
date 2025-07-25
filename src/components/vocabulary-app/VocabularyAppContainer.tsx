
import React, { useMemo } from "react";
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
import { DebugInfoContext } from '@/contexts/DebugInfoContext';

const VocabularyAppContainer: React.FC = () => {
  console.log('[VOCAB-CONTAINER] === Component Render ===');
  
  // Get all app state with error boundary
  const appState = useVocabularyAppState();
  
  // Destructure with fallback values to prevent deployment issues
  const {
    hasData = false,
    hasAnyData = false,
    handleFileUploaded = () => {},
    jsonLoadError = null,
    handleSwitchCategory = () => {},
    currentCategory = '',
    nextCategory = '',
    displayTime = 0,
    wordList = [],
    muted = false,
    paused = false,
    selectedVoice = { region: 'UK' as const },
    toggleMute = () => {},
    togglePause = () => {},
    goToNextWord = () => {},
    cycleVoice = () => {},
    playCurrentWord = () => {},
    playbackCurrentWord = null,
    userInteractionRef = { current: false },
    hasUserInteracted = false,
    onUserInteraction = () => {},
    isSpeaking = false,
    isAddWordModalOpen = false,
    isEditMode = false,
    wordToEdit = null,
    handleOpenAddWordModal = () => {},
    handleOpenEditWordModal = () => {},
    handleCloseModal = () => {}
  } = appState || {};

  console.log('[VOCAB-CONTAINER] Container state:', {
    hasData,
    hasAnyData,
    wordListLength: wordList?.length || 0,
    currentCategory
  });

  // Determine display word with fallback logic
  const { displayWord, debugData } = useDisplayWord(playbackCurrentWord, wordList || [], hasData);

  const debugInfo = useMemo(() => ({
    isMuted: muted,
    selectedVoiceName: typeof selectedVoice === 'string' ? selectedVoice : selectedVoice?.region || 'UK',
    isPaused: paused,
    currentWord: debugData
  }), [muted, selectedVoice, paused, debugData]);

  // Ensure selectedVoice has all required properties for voice labels
  // Handle both VoiceSelection and simplified { region } objects
  const voiceForLabels = {
    region: (typeof selectedVoice === 'string' ? selectedVoice : selectedVoice?.region || 'UK') as 'US' | 'UK' | 'AU',
    label: typeof selectedVoice === 'string' 
      ? selectedVoice 
      : ('label' in selectedVoice ? selectedVoice.label : selectedVoice?.region || 'UK'),
    gender: (typeof selectedVoice === 'string' 
      ? 'female' 
      : ('gender' in selectedVoice ? selectedVoice.gender : 'female')) as 'male' | 'female',
    index: typeof selectedVoice === 'string' 
      ? (selectedVoice === 'US' ? 0 : selectedVoice === 'UK' ? 1 : 2)
      : ('index' in selectedVoice ? selectedVoice.index : 1)
  };
  
  const { nextVoiceLabel } = useVoiceLabels(voiceForLabels);

  // Audio initialization with error handling
  useAudioInitialization({
    userInteractionRef,
    playCurrentWord,
    playbackCurrentWord
  });
  
  useUserInteractionHandler({
    userInteractionRef,
    playCurrentWord,
    playbackCurrentWord,
    onUserInteraction
  });
  
  useAutoPlayOnDataLoad({
    hasData,
    currentWord: playbackCurrentWord,
    hasUserInteracted,
    playCurrentWord
  });

  // Word management operations with null check
  const wordManager = displayWord ? VocabularyWordManager({
    currentWord: displayWord,
    currentCategory,
    onWordSaved: handleCloseModal
  }) : null;

  const handleSaveWord = React.useCallback((wordData: { word: string; meaning: string; example: string; category: string }) => {
    try {
      if (wordManager) {
        wordManager.handleSaveWord(wordData, isEditMode, wordToEdit);
      }
    } catch (error) {
      console.log('Error saving word:', error);
    }
  }, [wordManager, isEditMode, wordToEdit]);

  // Get interaction handlers with error boundaries
  const interactionHandlers = useUserInteractionHandlers({
    userInteractionRef,
    goToNextWord,
    togglePause,
    cycleVoice,
    toggleMute,
    handleSwitchCategory,
    currentCategory,
    nextCategory,
    onUserInteraction
  });

  const {
    handleCategorySwitchDirect = () => {},
    handleManualNext = () => {},
    handleTogglePauseWithInteraction = () => {},
    handleCycleVoiceWithInteraction = () => {},
    handleToggleMuteWithInteraction = () => {}
  } = interactionHandlers || {};

  // Ensure selectedVoice is properly formatted for display
  const displaySelectedVoice = typeof selectedVoice === 'string' ? selectedVoice : selectedVoice?.region || 'UK';

  return (
    <DebugInfoContext.Provider value={debugInfo}>
    <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
        <VocabularyAppContent
        hasData={hasData}
        hasAnyData={hasAnyData}
        displayWord={displayWord}
        jsonLoadError={!!jsonLoadError}
        muted={muted}
        paused={paused}
        isSpeaking={isSpeaking}
        selectedVoice={displaySelectedVoice}
        nextVoiceLabel={nextVoiceLabel}
        currentCategory={currentCategory}
        nextCategory={nextCategory}
        displayTime={displayTime}
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
    </DebugInfoContext.Provider>
  );
};

export default VocabularyAppContainer;
