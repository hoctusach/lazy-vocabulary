
import React from "react";
import { useVocabularyManager } from "@/hooks/useVocabularyManager";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import VocabularyLayout from "@/components/VocabularyLayout";
import VocabularyCard from "@/components/VocabularyCard";
import WelcomeScreen from "@/components/WelcomeScreen";
import { vocabularyService } from "@/services/vocabularyService";
import { useVocabularyAudioSync } from "@/hooks/useVocabularyAudioSync";
import { useMuteToggle } from "@/hooks/useMuteToggle";
import { useAudioPlayback } from "./useAudioPlayback";

const VocabularyAppContainer: React.FC = () => {
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

  return (
    <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
      {hasData && currentWord ? (
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
      ) : (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;
