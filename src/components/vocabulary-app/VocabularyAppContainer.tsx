import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    setHasData
  } = useVocabularyManager();

  const {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded
  } = useSpeechSynthesis();

  const [speechError, setSpeechError] = useState(false);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0); // Track the current audio being played
  const [displayTimeRemaining, setDisplayTimeRemaining] = useState(0); // Track how long to display each card
  const [isSoundPlaying, setIsSoundPlaying] = useState(false); // Track if sound is currently playing
  const [isLoading, setIsLoading] = useState(true); // Track loading state

  const currentCategory = vocabularyService.getCurrentSheetName();
  const sheetOptions = vocabularyService.sheetOptions;
  const nextIndex = (sheetOptions.indexOf(currentCategory) + 1) % sheetOptions.length;
  const nextCategory = sheetOptions[nextIndex];

  const soundRef = useRef<HTMLAudioElement | null>(null); // Ref to keep track of the sound

  // Helper function to calculate the duration of sound (word + meaning + example)
  const calculateDuration = useCallback(() => {
    const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`;
    return fullText.split(' ').length * 200; // 200ms per word
  }, [currentWord]);

  // Function to handle mute/unmute behavior
  const speakAndAdvance = useCallback(() => {
    if (wordQueue.current.length > 0 && !isPaused && !isMuted) {
      const word = wordQueue.current[0];
      const meaning = meaningQueue.current[0];
      const example = exampleQueue.current[0];
      const fullText = `${word}. ${meaning}. ${example}`;

      speakText(fullText)
        .then(() => {
          // After speaking, remove the word from the queue and move to next
          wordQueue.current.shift();
          meaningQueue.current.shift();
          exampleQueue.current.shift();

          // Move to the next word after speaking the current one
          handleManualNext();
        })
        .catch(err => {
          console.error('Speech error:', err);
          setSpeechError(true); // Set error if speech fails
        });
    }
  }, [speakText, handleManualNext, isMuted, isPaused]);

  // Load words and prepare them for sequential reading
  useEffect(() => {
    if (currentWord && !isPaused && !isMuted && isVoicesLoaded) {
      setIsLoading(false); // Set loading state to false once currentWord is available
      // Initialize the queues for the current word, meaning, and example
      wordQueue.current.push(currentWord.word);
      meaningQueue.current.push(currentWord.meaning);
      exampleQueue.current.push(currentWord.example);

      // Start speaking the word after a short delay
      setTimeout(() => speakAndAdvance(), 500);
    }
  }, [currentWord, isPaused, isMuted, isVoicesLoaded, speakAndAdvance]);

  // Logic to track sound progress and handle mute functionality
  useEffect(() => {
    if (isMuted || !currentWord || isPaused) {
      setIsSoundPlaying(false);
      setDisplayTimeRemaining(0); // Do not play sound, but still display the word
      if (soundRef.current) {
        soundRef.current.pause(); // Stop sound immediately when muted
      }
      return;
    }

    if (!isSoundPlaying) {
      setIsSoundPlaying(true);
      const duration = calculateDuration();
      setDisplayTimeRemaining(duration); // Set display time equal to the sound duration
      // Play the sound if it's not muted
      if (soundRef.current) {
        soundRef.current.play();
      }
    }
  }, [currentWord, isMuted, isPaused, isSoundPlaying, calculateDuration]);

  // Display card while ensuring the time is displayed for the estimated duration
  useEffect(() => {
    if (displayTimeRemaining > 0) {
      setTimeout(() => {
        setDisplayTimeRemaining(0);
        handleManualNext(); // Advance after the display duration is over
      }, displayTimeRemaining);
    }
  }, [displayTimeRemaining, handleManualNext]);

  const handleMuteClick = () => {
    if (isMuted) {
      // If currently muted, unmute and play the word
      if (soundRef.current) {
        soundRef.current.play();
      }
    } else {
      // If muted, stop any sound playing immediately
      if (soundRef.current) {
        soundRef.current.pause();
      }
    }
    handleToggleMute(); // Toggle the mute state
  };

  // If the page is loading, show a loading message
  if (isLoading) {
    return (
      <div className="loading-screen">
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
      {hasData && currentWord ? (
        <>
          {/* Show the word, meaning, and example */}
          <VocabularyCard
            word={currentWord.word}
            meaning={currentWord.meaning}
            example={currentWord.example}
            backgroundColor="#ffffff"
            isMuted={isMuted}
            isPaused={isPaused}
            voiceRegion={voiceRegion}
            onToggleMute={handleMuteClick}
            onTogglePause={handleTogglePause}
            onChangeVoice={handleChangeVoice}
            onSwitchCategory={() => handleSwitchCategory()}
            currentCategory={currentCategory}
            nextCategory={nextCategory}
            isSpeaking={isSoundPlaying}
            onNextWord={handleManualNext}
          />
          {/* Show error message if speech fails */}
          {speechError && (
            <div className="alert alert-danger">
              Audio is unavailable at the moment. Please try again later.
            </div>
          )}
        </>
      ) : (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;
