import React, { useState, useEffect, useRef } from "react";
import { useVocabularyManager } from "@/hooks/useVocabularyManager";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import VocabularyLayout from "@/components/VocabularyLayout";
import VocabularyCard from "@/components/VocabularyCard";
import WelcomeScreen from "@/components/WelcomeScreen";
import { vocabularyService } from "@/services/vocabularyService";
import { speak } from "@/utils/speech/core/speechPlayer"; // Importing the speak function from your utility file

const VocabularyAppContainer: React.FC = () => {
  const [isMuted, setIsMuted] = useState(false); // Mute state
  const [currentWord, setCurrentWord] = useState(null); // To store current word
  const [isPaused, setIsPaused] = useState(false); // To control pause state
  const [hasData, setHasData] = useState(false); // To check if data is loaded
  const [isSpeaking, setIsSpeaking] = useState(false); // To check if word is being spoken
  const [wordQueue, setWordQueue] = useState([]); // Queue of words to speak

  const { handleFileUploaded, handleTogglePause, handleManualNext, handleSwitchCategory } = useVocabularyManager();
  const { speakText, isVoicesLoaded } = useSpeechSynthesis();

  const currentCategory = vocabularyService.getCurrentSheetName();
  const sheetOptions = vocabularyService.sheetOptions;
  const nextIndex = (sheetOptions.indexOf(currentCategory) + 1) % sheetOptions.length;
  const nextCategory = sheetOptions[nextIndex];

  const wordDurationRef = useRef(0); // To keep track of the word's speech duration

  // Handle mute/unmute functionality
  const toggleMute = () => {
    setIsMuted((prev) => !prev);
    if (isMuted) {
      console.log("Speech is unmuted");
    } else {
      console.log("Speech is muted");
      setIsSpeaking(false); // Stop any ongoing speech
    }
  };

  const speakCurrentWord = async (word: string, meaning: string, example: string) => {
    if (isMuted) {
      console.log("Muted - not speaking");
      setIsSpeaking(false);
      return; // Skip speech if muted
    }
    try {
      console.log("Speaking word:", word);
      setIsSpeaking(true);
      await speak(`${word} ${meaning} ${example}`); // This will speak word, meaning and example
    } catch (error) {
      console.error("Error speaking word:", error);
      setIsSpeaking(false); // Reset speaking flag if speech fails
    }
  };

  useEffect(() => {
    if (!hasData || !currentWord || isPaused || !isVoicesLoaded) {
      return;
    }

    const currentWordText = currentWord.word;
    const meaning = currentWord.meaning;
    const example = currentWord.example;
    speakCurrentWord(currentWordText, meaning, example).then(() => {
      handleManualNext();
    }).catch(err => console.error('Speech error:', err));
  }, [currentWord, hasData, isPaused, isMuted, isVoicesLoaded]);

  const displayNextWord = () => {
    if (wordQueue.length === 0) {
      console.log("All words are displayed.");
      return;
    }
    const nextWord = wordQueue.shift();
    setCurrentWord(nextWord);

    // Update word duration for the current word
    wordDurationRef.current = nextWord.duration;

    // Display the next word, and play its sound
    speakCurrentWord(nextWord.word, nextWord.meaning, nextWord.example);
  };

  // Handle the next word button click
  const handleNextWordClick = () => {
    if (!isMuted && !isSpeaking) {
      displayNextWord();
    } else {
      console.log("Speech is muted or still speaking, waiting for the next word.");
    }
  };

  // Loading words into the queue
  const loadWords = () => {
    // Replace with logic to fetch words and durations from your data source
    const words = [
      { word: "example1", meaning: "meaning1", example: "example sentence 1", duration: 5000 },
      { word: "example2", meaning: "meaning2", example: "example sentence 2", duration: 6000 },
      // Add more words with their respective durations
    ];
    setWordQueue(words); // Store the words in the queue for sequential processing
  };

  // Initialize words on mount
  useEffect(() => {
    loadWords(); // Load words when the component mounts
  }, []);

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
          voiceRegion="US"
          onToggleMute={toggleMute}
          onTogglePause={handleTogglePause}
          onChangeVoice={handleSwitchCategory}
          onSwitchCategory={() => {}}
          currentCategory={currentCategory}
          nextCategory={nextCategory}
          isSpeaking={isSpeaking}
          onNextWord={handleNextWordClick}
        />
      ) : (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;
