import React, { useEffect, useState, useRef } from "react";
import { useVocabularyManager } from "@/hooks/useVocabularyManager";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import VocabularyLayout from "@/components/VocabularyLayout";
import VocabularyCard from "@/components/VocabularyCard";
import WelcomeScreen from "@/components/WelcomeScreen";
import { vocabularyService } from "@/services/vocabularyService";

const VocabularyAppContainer: React.FC = () => {
  const {
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause,
    handleManualNext,
    handleSwitchCategory,
  } = useVocabularyManager();

  const {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded,
  } = useSpeechSynthesis();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [speechError, setSpeechError] = useState(false);

  const [words, setWords] = useState<string[]>([]);
  const [meanings, setMeanings] = useState<string[]>([]);
  const [examples, setExamples] = useState<string[]>([]);

  const [audioPlaying, setAudioPlaying] = useState<boolean>(false); // To track if audio is playing

  const currentCategory = vocabularyService.getCurrentSheetName();
  const sheetOptions = vocabularyService.sheetOptions;
  const nextIndex = (sheetOptions.indexOf(currentCategory) + 1) % sheetOptions.length;
  const nextCategory = sheetOptions[nextIndex];

  // Preload and play the sound after displaying the word
  const preloadAndPlayAudio = (word: string, meaning: string, example: string) => {
    if (!isVoicesLoaded || isPaused || isMuted) {
      return;
    }

    const fullText = `${word}. ${meaning}. ${example}`;

    // Speak the word, meaning, and example sequentially
    setAudioPlaying(true);
    speakText(fullText)
      .then(() => {
        setAudioPlaying(false); // Audio finished playing
        handleManualNext(); // Proceed to the next word once the audio is finished
      })
      .catch((error) => {
        console.error("Error with speech synthesis: ", error);
        setSpeechError(true);
        setAudioPlaying(false); // If there's an error, stop playing the audio
      });
  };

  useEffect(() => {
    if (hasData && currentWord && !isPaused && !isMuted && isVoicesLoaded) {
      const word = currentWord.word;
      const meaning = currentWord.meaning;
      const example = currentWord.example;

      // Display the word and start speaking it
      preloadAndPlayAudio(word, meaning, example);
    }
  }, [currentWord, hasData, isPaused, isMuted, isVoicesLoaded]);

  // Automatically advance after speech finishes
  useEffect(() => {
    if (!audioPlaying) {
      handleManualNext(); // Proceed to next word if audio is not playing
    }
  }, [audioPlaying, handleManualNext]);

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
