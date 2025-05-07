
import React from "react";
import VocabularyLayout from "@/components/VocabularyLayout";
import WelcomeScreen from "@/components/WelcomeScreen";
import { useCustomWords } from "@/hooks/useCustomWords";
import { toast } from "sonner";
import AddWordButton from "./AddWordButton";
import AddWordModal from "./AddWordModal";
import DebugPanel from "@/components/DebugPanel";
import ErrorDisplay from "./ErrorDisplay";
import VocabularyMain from "./VocabularyMain";
import { useVocabularyContainerState } from "@/hooks/vocabulary/useVocabularyContainerState";

const VocabularyAppContainer: React.FC = () => {
  // Custom words hook
  const { addCustomWord } = useCustomWords();
  
  // Get all state and handlers from our custom hook
  const {
    isAddWordModalOpen,
    setIsAddWordModalOpen,
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause,
    handleManualNext,
    jsonLoadError,
    mute,
    voiceRegion,
    toggleMute,
    handleChangeVoice,
    speechError,
    hasSpeechPermission,
    retrySpeechInitialization,
    handleSwitchCategory,
    currentCategory,
    nextCategory,
    isSoundPlaying,
    displayTime,
    debugPanelData
  } = useVocabularyContainerState();

  // Handler for saving a new word
  const handleSaveWord = (newWord: { word: string; meaning: string; example: string; category: string }) => {
    // Add the new custom word - make sure all required properties are provided
    addCustomWord({
      word: newWord.word,
      meaning: newWord.meaning,
      example: newWord.example,
      category: newWord.category, // This is always required from the modal
      count: 0 // Initialize count with 0 for new words
    });
    
    // Show success notification
    toast.success(`"${newWord.word}" added to ${newWord.category}`, {
      description: "The word has been added to your custom vocabulary."
    });
  };

  // Handle speech retry
  const handleSpeechRetry = () => {
    retrySpeechInitialization();
  };

  return (
    <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
      {/* Error display component */}
      <ErrorDisplay jsonLoadError={jsonLoadError} />

      {hasData && currentWord ? (
        <>
          {/* Main vocabulary display */}
          <VocabularyMain
            currentWord={currentWord}
            mute={mute}
            isPaused={isPaused}
            voiceRegion={voiceRegion}
            toggleMute={toggleMute}
            handleTogglePause={handleTogglePause}
            handleChangeVoice={handleChangeVoice}
            handleSwitchCategory={() => handleSwitchCategory(mute, voiceRegion)}
            currentCategory={currentCategory}
            nextCategory={nextCategory}
            isSoundPlaying={isSoundPlaying}
            handleManualNext={handleManualNext}
            displayTime={displayTime}
            speechError={speechError}
            hasSpeechPermission={hasSpeechPermission}
            handleSpeechRetry={handleSpeechRetry}
          />
          
          {/* Add Word Button */}
          <AddWordButton onClick={() => setIsAddWordModalOpen(true)} />
          
          {/* Debug Panel */}
          <DebugPanel 
            isMuted={mute}
            voiceRegion={voiceRegion}
            isPaused={isPaused}
            currentWord={debugPanelData}
          />
          
          {/* Enhanced Add Word Modal with dictionary lookup */}
          <AddWordModal 
            isOpen={isAddWordModalOpen} 
            onClose={() => setIsAddWordModalOpen(false)} 
            onSave={handleSaveWord} 
          />
        </>
      ) : (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;
