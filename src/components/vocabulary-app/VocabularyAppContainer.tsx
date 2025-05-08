
import React, { useState } from "react";
import VocabularyLayout from "@/components/VocabularyLayout";
import WelcomeScreen from "@/components/WelcomeScreen";
import { useCustomWords } from "@/hooks/useCustomWords";
import { toast } from "sonner";
import AddWordButton from "./AddWordButton";
import EditWordButton from "./EditWordButton";
import AddWordModal from "./AddWordModal";
import DebugPanel from "@/components/DebugPanel";
import ErrorDisplay from "./ErrorDisplay";
import VocabularyMain from "./VocabularyMain";
import { useVocabularyContainerState } from "@/hooks/vocabulary/useVocabularyContainerState";

const VocabularyAppContainer: React.FC = () => {
  // Custom words hook
  const { addCustomWord, updateWord } = useCustomWords();
  
  // Modal states
  const [isAddWordModalOpen, setIsAddWordModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Get all state and handlers from our custom hook
  const {
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

  // Handler for opening the add word modal
  const handleOpenAddWordModal = () => {
    setIsEditMode(false);
    setIsAddWordModalOpen(true);
  };
  
  // Handler for opening the edit word modal
  const handleOpenEditWordModal = () => {
    if (!currentWord) return;
    setIsEditMode(true);
    setIsAddWordModalOpen(true);
  };
  
  // Handler for closing the modal
  const handleCloseModal = () => {
    setIsAddWordModalOpen(false);
  };

  // Handler for saving a new word or updating an existing word
  const handleSaveWord = (wordData: { word: string; meaning: string; example: string; category: string }) => {
    if (isEditMode && currentWord) {
      // Update existing word
      updateWord({
        word: wordData.word,
        meaning: wordData.meaning,
        example: wordData.example,
        category: wordData.category
      });
      
      // Show success notification
      toast.success(`"${wordData.word}" updated successfully`, {
        description: "The word has been updated in your vocabulary."
      });
    } else {
      // Add the new custom word - make sure all required properties are provided
      addCustomWord({
        word: wordData.word,
        meaning: wordData.meaning,
        example: wordData.example,
        category: wordData.category, // This is always required from the modal
        count: 0 // Initialize count with 0 for new words
      });
      
      // Show success notification
      toast.success(`"${wordData.word}" added to ${wordData.category}`, {
        description: "The word has been added to your custom vocabulary."
      });
    }
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
          
          {/* Action buttons container */}
          <div className="flex items-center justify-center gap-2 my-3">
            <EditWordButton 
              onClick={handleOpenEditWordModal} 
              disabled={!currentWord}
            />
            <AddWordButton onClick={handleOpenAddWordModal} />
          </div>
          
          {/* Debug Panel */}
          <DebugPanel 
            isMuted={mute}
            voiceRegion={voiceRegion}
            isPaused={isPaused}
            currentWord={debugPanelData}
          />
          
          {/* Enhanced Word Modal (handles both add and edit) */}
          <AddWordModal 
            isOpen={isAddWordModalOpen} 
            onClose={handleCloseModal} 
            onSave={handleSaveWord}
            editMode={isEditMode}
            wordToEdit={isEditMode ? currentWord : undefined}
          />
        </>
      ) : (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;
