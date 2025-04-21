import React, { useRef, useEffect, useCallback, useState } from "react";
import { useVocabularyManager } from "@/hooks/useVocabularyManager";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useWordSpeechSync } from "@/hooks/useWordSpeechSync";
import { vocabularyService } from "@/services/vocabularyService";
import VocabularyCard from "@/components/VocabularyCard";
import WelcomeScreen from "@/components/WelcomeScreen";
import VocabularyLayout from "@/components/VocabularyLayout";
import { stopSpeaking } from "@/utils/speech";
import { useBackgroundColor } from "./useBackgroundColor";
import { useVocabularyAppHandlers } from "./useVocabularyAppHandlers";

const VocabularyAppContainer: React.FC = () => {
  // Refs and state
  const initialRenderRef = useRef(true);
  const [showWordCard] = useState(true);

  // Core hooks
  const {
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause,
    handleManualNext,
    handleSwitchCategory,
    setHasData,
    isSpeakingRef,
    isChangingWordRef
  } = useVocabularyManager();

  const {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded,
    speakingRef,
    getCurrentText
  } = useSpeechSynthesis();

  const {
    speakCurrentWord,
    resetLastSpokenWord,
    wordFullySpoken
  } = useWordSpeechSync(
    currentWord,
    isPaused,
    isMuted,
    isVoicesLoaded,
    speakText,
    isSpeakingRef,
    isChangingWordRef
  );

  const {
    backgroundColor,
    advanceColor,
    backgroundColorIndex,
    setBackgroundColorIndex,
    backgroundColors
  } = useBackgroundColor();

  const currentSheetName = vocabularyService.getCurrentSheetName();
  const nextSheetIndex =
    (vocabularyService.sheetOptions.indexOf(currentSheetName) + 1) %
    vocabularyService.sheetOptions.length;
  const nextSheetName = vocabularyService.sheetOptions[nextSheetIndex];

  const clearAllTimeouts = useCallback(() => {
    // no-op in simplified version
  }, []);

  const {
    handleToggleMuteWithSpeaking,
    handleChangeVoiceWithSpeaking,
    handleSwitchCategoryWithState
  } = useVocabularyAppHandlers({
    speakingRef,
    clearAllTimeouts,
    getCurrentText,
    isPaused,
    isMuted,
    isVoicesLoaded,
    resetLastSpokenWord,
    speakCurrentWord,
    isChangingWordRef,
    currentWord,
    handleToggleMute,
    handleChangeVoice,
    handleSwitchCategory,
    voiceRegion,
    setBackgroundColorIndex,
    backgroundColors
  });

  const handleNextWordClick = useCallback(() => {
    resetLastSpokenWord();
    stopSpeaking();
    handleManualNext();
  }, [resetLastSpokenWord, handleManualNext]);

  const toggleView = useCallback(() => {
    // No toggle in simplified version
  }, []);

  // Initial speak on load
  useEffect(() => {
    if (
      initialRenderRef.current &&
      currentWord &&
      !isPaused &&
      !isMuted &&
      isVoicesLoaded
    ) {
      initialRenderRef.current = false;
      resetLastSpokenWord();
      stopSpeaking();
      setTimeout(async () => {
        await speakCurrentWord(true);
        handleManualNext();
      }, 1000);
    }
  }, [
    currentWord,
    isPaused,
    isMuted,
    isVoicesLoaded,
    resetLastSpokenWord,
    speakCurrentWord,
    handleManualNext
  ]);

  // Advance and speak next word
  useEffect(() => {
    if (
      !initialRenderRef.current &&
      wordFullySpoken &&
      !isPaused &&
      !isMuted
    ) {
      handleManualNext();
      setTimeout(() => {
        if (!isPaused && !isMuted) {
          speakCurrentWord(true);
        }
      }, 50);
    }
  }, [
    wordFullySpoken,
    isPaused,
    isMuted,
    handleManualNext,
    speakCurrentWord
  ]);

  return (
    <VocabularyLayout
      showWordCard={showWordCard}
      hasData={hasData}
      onToggleView={toggleView}
    >
      {currentWord && hasData && showWordCard ? (
        <VocabularyCard
          word={currentWord.word}
          meaning={currentWord.meaning}
          example={currentWord.example}
          backgroundColor={backgroundColor}
          isMuted={isMuted}
          isPaused={isPaused}
          voiceRegion={voiceRegion}
          onToggleMute={handleToggleMuteWithSpeaking}
          onTogglePause={handleTogglePause}
          onChangeVoice={handleChangeVoiceWithSpeaking}
          onSwitchCategory={handleSwitchCategoryWithState}
          currentCategory={currentSheetName}
          nextCategory={nextSheetName}
          isSpeaking={speakingRef.current}
          onNextWord={handleNextWordClick}
        />
      ) : (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;