import React, { useRef, useEffect } from "react";
import { useVocabularyManager } from "@/hooks/useVocabularyManager";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useWordSpeechSync } from "@/hooks/useWordSpeechSync";
import { stopSpeaking } from "@/utils/speech";
import VocabularyLayout from "@/components/VocabularyLayout";
import VocabularyCard from "@/components/VocabularyCard";
import WelcomeScreen from "@/components/WelcomeScreen";

const VocabularyAppContainer: React.FC = () => {
  const initialRenderRef = useRef(true);

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

  // ─── Speak first word then advance ────────────────────────────
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
  // ───────────────────────────────────────────────────────────────

  // ─── After each word finishes, advance & speak next ───────────
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
  // ───────────────────────────────────────────────────────────────

  return (
    <VocabularyLayout hasData={hasData}>
      {hasData && currentWord ? (
        <VocabularyCard
          word={currentWord.word}
          meaning={currentWord.meaning}
          example={currentWord.example}
          backgroundColor="#fff"
          isMuted={isMuted}
          isPaused={isPaused}
          voiceRegion={voiceRegion}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          onChangeVoice={handleChangeVoice}
          onSwitchCategory={handleSwitchCategory}
          isSpeaking={speakingRef.current}
          onNextWord={handleManualNext}
          currentCategory={""}
          nextCategory={""}
        />
      ) : (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;
