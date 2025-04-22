
import React, { useState, useEffect, useRef, useCallback } from "react";
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
    isVoicesLoaded,
    stopSpeaking
  } = useSpeechSynthesis();

  const [isSoundPlaying, setIsSoundPlaying] = useState(false);
  const [mute, setMute] = useState(isMuted);
  const currentCategory = vocabularyService.getCurrentSheetName();
  const sheetOptions = vocabularyService.sheetOptions;
  const nextIndex = (sheetOptions.indexOf(currentCategory) + 1) % sheetOptions.length;
  const nextCategory = sheetOptions[nextIndex];

  // Auto-advance timer
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const [displayTime, setDisplayTime] = useState(10000);  // Default display time

  // Clear the auto-advance timer
  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  // Handle playing audio when the current word changes
  useEffect(() => {
    const playWordAudio = async () => {
      if (!currentWord || mute || isPaused) return;
      
      // Clear any existing timers
      clearAutoAdvanceTimer();
      setIsSoundPlaying(true);
      
      try {
        // Create the full text to speak
        const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`;
        
        // Speak the text and wait for completion
        await speakText(fullText);
        
        // After speech completes, set timer for next word
        if (!isPaused && !mute) {
          autoAdvanceTimerRef.current = window.setTimeout(() => {
            if (!isPaused) {
              handleManualNext();
            }
          }, 2000); // Wait 2 seconds after audio finishes before advancing
        }
      } catch (error) {
        console.error("Error playing audio:", error);
      } finally {
        setIsSoundPlaying(false);
      }
    };

    // Start playing audio when current word changes
    playWordAudio();
    
    // Cleanup function
    return () => {
      clearAutoAdvanceTimer();
      stopSpeaking();
    };
  }, [currentWord, mute, isPaused, speakText, handleManualNext, clearAutoAdvanceTimer, stopSpeaking]);

  // Handle mute state changes
  useEffect(() => {
    setMute(isMuted);
  }, [isMuted]);

  // Toggle mute
  const toggleMute = () => {
    setMute(!mute);
    handleToggleMute();
    
    if (!mute) {
      stopSpeaking();
      clearAutoAdvanceTimer();
    } else if (currentWord && !isPaused) {
      // If unmuting, play the current word
      const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`;
      speakText(fullText);
    }
  };

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
        />
      ) : (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;
