
import React, { useState } from "react";
import { useVocabularyManager } from "@/hooks/useVocabularyManager";
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
    setHasData
  } = useVocabularyManager();

  // Speech synthesis for voice management
  const {
    isMuted,
    voiceRegion,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded,
    stopSpeaking
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
      {hasData && currentWord ? (
        <>
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
          
          {/* Add Word Modal */}
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
