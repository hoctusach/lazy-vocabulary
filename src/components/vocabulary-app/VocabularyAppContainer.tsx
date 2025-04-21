import React, { useEffect, useState, useRef, useCallback } from "react";
import { useVocabularyManager } from "@/hooks/useVocabularyManager";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import VocabularyLayout from "@/components/VocabularyLayout";
import VocabularyCard from "@/components/VocabularyCard";
import WelcomeScreen from "@/components/WelcomeScreen";
import { vocabularyService } from "@/services/vocabularyService";
import { gTTS } from "gtts"; // Assuming you have a mechanism to use gTTS or similar for text-to-speech

const VocabularyAppContainer: React.FC = () => {
  const {
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause,
    handleManualNext,
    handleSwitchCategory,
    setHasData,
  } = useVocabularyManager();

  const {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded,
  } = useSpeechSynthesis();

  const [speechError, setSpeechError] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [words, setWords] = useState<string[]>([]);
  const [meanings, setMeanings] = useState<string[]>([]);
  const [examples, setExamples] = useState<string[]>([]);
  const [preloadedAudio, setPreloadedAudio] = useState<any>(null);

  const currentCategory = vocabularyService.getCurrentSheetName();
  const sheetOptions = vocabularyService.sheetOptions;
  const nextIndex = (sheetOptions.indexOf(currentCategory) + 1) % sheetOptions.length;
  const nextCategory = sheetOptions[nextIndex];

  const preloadNextAudio = useCallback((word, meaning, example) => {
    // Placeholder for audio file preloading logic.
    const fullText = `${word}. ${meaning}. ${example}`;
    const audioFile = new Audio();
    audioFile.src = `path-to-audio-service/${fullText}`; // Assuming a function or service to generate audio
    audioFile.onloadeddata = () => {
      setPreloadedAudio(audioFile);
    };
  }, []);

  const speakAndAdvance = useCallback(async () => {
    if (!hasData || isPaused || isMuted || !isVoicesLoaded) {
      setSpeechError(true);
      return;
    }

    const wordData = vocabularyService.getNextWord();
    if (wordData) {
      const fullText = `${wordData.word}. ${wordData.meaning}. ${wordData.example}`;
      try {
        setIsSpeaking(true);
        await speakText(fullText); // Speak the word, meaning, and example
        setIsSpeaking(false);
        handleManualNext(); // Proceed to the next word after this one finishes
      } catch (error) {
        console.error("Speech error:", error);
        setSpeechError(true);
      }
    }
  }, [hasData, isPaused, isMuted, isVoicesLoaded, speakText, handleManualNext]);

  useEffect(() => {
    if (preloadedAudio) {
      preloadedAudio.play(); // Play the preloaded audio
      preloadedAudio.onended = () => {
        handleManualNext(); // Proceed to the next word when audio ends
      };
    }
  }, [preloadedAudio, handleManualNext]);

  // Manage word display and advance to the next word after the current word is fully read
  useEffect(() => {
    if (!hasData || !currentWord || isPaused || isMuted || !isVoicesLoaded) {
      return;
    }

    preloadNextAudio(currentWord.word, currentWord.meaning, currentWord.example);
  }, [currentWord, hasData, isPaused, isMuted, isVoicesLoaded, preloadNextAudio]);

  return (
    <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
      {hasData && currentWord ? (
        <VocabularyCard
          word={currentWord.word}
          meaning={currentWord.meaning}
          example={currentWord.example}
          backgroundColor="#ffffff"
          isMuted={isMuted}
          isPaused={isPaused}
          voiceRegion={voiceRegion}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          onChangeVoice={handleChangeVoice}
          onSwitchCategory={() => handleSwitchCategory(isMuted, voiceRegion)}
          currentCategory={currentCategory}
          nextCategory={nextCategory}
          isSpeaking={isSpeaking}
          onNextWord={handleManualNext}
        />
      ) : (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;

