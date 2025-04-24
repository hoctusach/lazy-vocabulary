
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useVocabularyManager } from "@/hooks/useVocabularyManager";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import VocabularyLayout from "@/components/VocabularyLayout";
import VocabularyCard from "@/components/VocabularyCard";
import WelcomeScreen from "@/components/WelcomeScreen";
import { vocabularyService } from "@/services/vocabularyService";
import { speak } from "@/utils/speech";

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
      if (!currentWord || mute || isPaused) {
        console.log('Skipping speech: no word, muted, or paused');
        return;
      }
      
      // Clear any existing timers
      clearAutoAdvanceTimer();
      setIsSoundPlaying(true);
      
      try {
        console.log('Starting to speak word:', currentWord.word);
        
        // Create the full text to speak
        const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`;
        
        // Use the direct speak function from utils/speech for more reliability
        await speak(fullText, voiceRegion);
        
        console.log('Speech completed for:', currentWord.word);
        
        // After speech completes, set timer for next word
        if (!isPaused && !mute) {
          console.log('Setting timer for next word');
          autoAdvanceTimerRef.current = window.setTimeout(() => {
            if (!isPaused) {
              console.log('Auto-advancing to next word');
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
  }, [currentWord, mute, isPaused, voiceRegion, handleManualNext, clearAutoAdvanceTimer, stopSpeaking]);

  // Handle mute state changes
  useEffect(() => {
    setMute(isMuted);
  }, [isMuted]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setMute(!mute);
    handleToggleMute();
    
    if (!mute) {
      console.log('Muting, stopping speech');
      stopSpeaking();
      clearAutoAdvanceTimer();
    } else if (currentWord && !isPaused) {
      // If unmuting, play the current word
      console.log('Unmuting, playing current word');
      const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`;
      speak(fullText, voiceRegion);
    }
  }, [mute, currentWord, isPaused, voiceRegion, handleToggleMute, stopSpeaking, clearAutoAdvanceTimer]);

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
