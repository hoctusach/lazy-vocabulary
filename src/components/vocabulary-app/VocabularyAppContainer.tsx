
import React, { useState } from "react";
import { useVocabularyManager } from "@/hooks/vocabulary/useVocabularyManager";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import VocabularyLayout from "@/components/VocabularyLayout";
import VocabularyCard from "@/components/VocabularyCard";
import WelcomeScreen from "@/components/WelcomeScreen";
import { vocabularyService } from "@/services/vocabularyService";
import { useVocabularyAudioSync } from "@/hooks/useVocabularyAudioSync";
import { useMuteToggle } from "@/hooks/useMuteToggle";
import { useAudioPlayback } from "./useAudioPlayback";
import AddWordButton from "./AddWordButton";
import AddWordModal from "./AddWordModal";
import DebugPanel from "@/components/DebugPanel";
import { useCustomWords } from "@/hooks/useCustomWords";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

const VocabularyAppContainer: React.FC = () => {
  // Add state for modal visibility
  const [isAddWordModalOpen, setIsAddWordModalOpen] = useState(false);
  
  // Custom words hook
  const { addCustomWord } = useCustomWords();

  // Vocabulary manager for handling word navigation
  const {
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause,
    handleManualNext,
    handleSwitchCategory,
    setHasData,
    jsonLoadError
  } = useVocabularyManager();

  // Speech synthesis for voice management
  const {
    isMuted,
    voiceRegion,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded,
    stopSpeaking,
    speechError,
    hasSpeechPermission,
    retrySpeechInitialization
  } = useSpeechSynthesis();

  // Audio sync management
  const {
    isSoundPlaying,
    setIsSoundPlaying,
    autoAdvanceTimerRef,
    displayTime,
    setDisplayTime,
    lastSpokenWordRef,
    wordChangeProcessingRef,
    speechAttemptsRef,
    clearAutoAdvanceTimer,
    resetLastSpokenWord
  } = useVocabularyAudioSync(currentWord, isPaused, isMuted, voiceRegion);

  // Mute toggle functionality
  const { mute, toggleMute } = useMuteToggle(
    isMuted, 
    handleToggleMute, 
    currentWord, 
    isPaused,
    clearAutoAdvanceTimer,
    stopSpeaking,
    voiceRegion
  );

  // Current and next category information
  const currentCategory = vocabularyService.getCurrentSheetName();
  const sheetOptions = vocabularyService.sheetOptions;
  const nextIndex = (sheetOptions.indexOf(currentCategory) + 1) % sheetOptions.length;
  const nextCategory = sheetOptions[nextIndex];

  // Audio playback hook to manage speech and auto-advancement
  useAudioPlayback(
    currentWord,
    isPaused,
    mute,
    voiceRegion,
    handleManualNext,
    isSoundPlaying,
    setIsSoundPlaying,
    clearAutoAdvanceTimer,
    autoAdvanceTimerRef,
    lastSpokenWordRef,
    wordChangeProcessingRef,
    speechAttemptsRef,
    stopSpeaking,
    displayTime
  );

  // Handle speech permissions
  const handleSpeechRetry = () => {
    retrySpeechInitialization();
  };

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

  // Prepare data for debug panel - ensure category is always present
  const debugPanelData = currentWord ? {
    word: currentWord.word,
    category: currentWord.category || currentCategory // Use the word's category if available, otherwise use the current category
  } : null;

  return (
    <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
      {/* Display JSON load error toast if needed */}
      {jsonLoadError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Custom vocabulary file is corrupt; loaded default list instead.
          </AlertDescription>
        </Alert>
      )}

      {hasData && currentWord ? (
        <>
          {/* Speech Error Alert */}
          {speechError && (
            <Alert 
              className="mb-4 bg-yellow-50 border-yellow-200 text-yellow-800"
              aria-live="polite"
            >
              <AlertDescription className="flex items-center justify-between">
                <span>{speechError}</span>
                {!hasSpeechPermission && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSpeechRetry} 
                    className="ml-4" 
                    aria-label="Retry speech"
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Retry Speech
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          <VocabularyCard
            word={currentWord.word}
            meaning={currentWord.meaning}
            example={currentWord.example}
            backgroundColor="#ffffff"
            isMuted={mute}
            isPaused={isPaused}
            voiceRegion={voiceRegion}
            onToggleMute={toggleMute}
            onTogglePause={handleTogglePause}
            onChangeVoice={handleChangeVoice}
            onSwitchCategory={() => handleSwitchCategory(mute, voiceRegion)}
            currentCategory={currentCategory}
            nextCategory={nextCategory}
            isSpeaking={isSoundPlaying}
            onNextWord={handleManualNext}
            displayTime={displayTime}
            category={currentWord.category || currentCategory}
          />
          
          {/* Add Word Button */}
          <AddWordButton onClick={() => setIsAddWordModalOpen(true)} />
          
          {/* Debug Panel - Use the prepared data with the guaranteed category */}
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
