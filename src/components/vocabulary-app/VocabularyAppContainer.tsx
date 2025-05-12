
import React from "react";
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
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import ReviewSession from "./spaced-repetition/ReviewSession";
import { useReviewSession } from "@/hooks/vocabulary/useReviewSession";
import { DueCounter } from "./spaced-repetition/DueCounter";

const VocabularyAppContainer: React.FC = () => {
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

  // Modal state management
  const {
    isAddWordModalOpen,
    isEditMode,
    wordToEdit,
    handleOpenAddWordModal,
    handleOpenEditWordModal,
    handleCloseModal
  } = useWordModalState();

  // Review session state management
  const {
    isReviewMode,
    reviewQueue,
    isLoading,
    startReviewSession,
    endReviewSession
  } = useReviewSession();

  // Handler for speech retry
  const handleSpeechRetry = () => {
    retrySpeechInitialization();
  };

  // Word management operations - call function with props when currentWord exists
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

  // Direct category switch handler that properly switches categories for playback
  const handleCategorySwitchDirect = (categoryName?: string) => {
    // If a specific category is provided, use it; otherwise use the next category in rotation
    const targetCategory = categoryName || nextCategory;
    if (targetCategory) {
      console.log(`Switching directly to category: ${targetCategory}`);
      handleSwitchCategory(currentCategory, targetCategory);
    }
  };

  return (
    <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
      {/* Error display component */}
      <ErrorDisplay jsonLoadError={jsonLoadError} />

      {hasData ? (
        isReviewMode ? (
          // Review Mode
          <ReviewSession
            initialQueue={reviewQueue}
            onComplete={endReviewSession}
            onCancel={endReviewSession}
          />
        ) : (
          // Normal Vocabulary Mode
          <>
            <div className="mb-4 flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={startReviewSession}
                disabled={isLoading}
                className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
              >
                <Clock className="h-4 w-4 mr-1" />
                Start Review
                <DueCounter />
              </Button>
            </div>

            <VocabularyMain
              currentWord={currentWord}
              mute={mute}
              isPaused={isPaused}
              voiceRegion={voiceRegion}
              toggleMute={toggleMute}
              handleTogglePause={handleTogglePause}
              handleChangeVoice={handleChangeVoice}
              handleSwitchCategory={handleCategorySwitchDirect}
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
            <WordActionButtons 
              currentWord={currentWord}
              onOpenAddModal={handleOpenAddWordModal}
              onOpenEditModal={() => handleOpenEditWordModal(currentWord)}
            />
            
            {/* Debug Panel */}
            <DebugPanel 
              isMuted={mute}
              voiceRegion={voiceRegion}
              isPaused={isPaused}
              currentWord={debugPanelData}
            />
          </>
        )
      ) : (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      )}
      
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
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;
