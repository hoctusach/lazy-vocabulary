
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
  
  // Flag to track if we're currently processing a word change
  const wordChangeProcessingRef = useRef(false);
  // Debug counter to track speech attempts
  const speechAttemptsRef = useRef(0);
  // Store the last word ID to avoid repeating speech for same word
  const lastSpokenWordRef = useRef<string | null>(null);
  
  // Clear the auto-advance timer
  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
      console.log('[APP] Auto-advance timer cleared');
    }
  }, []);

  // Handle playing audio when the current word changes
  useEffect(() => {
    if (!currentWord || mute || isPaused) {
      console.log('[APP] Skipping speech: ' + 
        (!currentWord ? 'no word' : '') + 
        (mute ? ', muted' : '') + 
        (isPaused ? ', paused' : ''));
      return;
    }
    
    // Check if we're already speaking this word
    if (lastSpokenWordRef.current === currentWord.word) {
      console.log('[APP] Already spoke this word, skipping:', currentWord.word);
      return;
    }
    
    // Set processing flag to prevent overlaps
    if (wordChangeProcessingRef.current) {
      console.log('[APP] Still processing previous word, will retry shortly');
      // Instead of skipping, retry after a short delay
      const retryTimeout = setTimeout(() => {
        if (currentWord && !mute && !isPaused) {
          console.log('[APP] Retrying speech for:', currentWord.word);
          wordChangeProcessingRef.current = false;
          speechAttemptsRef.current += 1;
          // This will re-trigger the useEffect as we changed the dependency
          setDisplayTime(prev => prev + 1);
        }
      }, 300);
      return () => clearTimeout(retryTimeout);
    }
    
    // Flag to track that we're processing a word
    wordChangeProcessingRef.current = true;
    speechAttemptsRef.current += 1;
    console.log(`[APP] Word change detected, attempt #${speechAttemptsRef.current} for: ${currentWord.word}`);
    
    // Clear any existing timers
    clearAutoAdvanceTimer();
    
    // Save this word as the last one we processed
    lastSpokenWordRef.current = currentWord.word;
    
    // Give the DOM time to update with new word
    const playWordAudio = async () => {
      try {
        // Set flag to show audio is playing
        setIsSoundPlaying(true);
        
        // First, ensure previous speech is stopped
        stopSpeaking();
        console.log('[APP] Previous speech stopped, preparing to speak:', currentWord.word);
        
        // IMPORTANT: Reduced delay before playing for better synchronization
        const prePlayDelay = 100; // Very short delay for better sync
        console.log(`[APP] Waiting ${prePlayDelay}ms before speaking`);
        await new Promise(resolve => setTimeout(resolve, prePlayDelay));
        
        console.log('[APP] ⚡ Starting to speak word:', currentWord.word);
        
        // Create the full text to speak
        const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`;
        
        // Use the direct speak function from utils/speech for more reliability
        await speak(fullText, voiceRegion);
        
        console.log('[APP] ✅ Speech completed for:', currentWord.word);
        
        // After speech completes, set timer for next word if not paused or muted
        if (!isPaused && !mute) {
          console.log('[APP] Setting timer for next word');
          autoAdvanceTimerRef.current = window.setTimeout(() => {
            if (!isPaused) {
              console.log('[APP] Auto-advancing to next word');
              handleManualNext();
            }
          }, 2000); // Wait 2 seconds after audio finishes before advancing
        }
      } catch (error) {
        console.error("[APP] Error playing audio:", error);
      } finally {
        setIsSoundPlaying(false);
        // Allow processing new words again
        wordChangeProcessingRef.current = false;
        console.log('[APP] Word processing completed for:', currentWord.word);
      }
    };

    // Start the audio playback with a shorter delay to ensure DOM rendering is complete
    console.log(`[APP] Scheduling speech for ${currentWord.word} in 100ms`); // Reduced from 150ms
    const speechTimerRef = setTimeout(playWordAudio, 100); 
    
    // Cleanup function
    return () => {
      clearTimeout(speechTimerRef);
      clearAutoAdvanceTimer();
      stopSpeaking();
    };
  }, [currentWord, mute, isPaused, voiceRegion, handleManualNext, clearAutoAdvanceTimer, stopSpeaking, displayTime]);

  // Handle mute state changes
  useEffect(() => {
    setMute(isMuted);
  }, [isMuted]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setMute(!mute);
    handleToggleMute();
    
    if (!mute) {
      console.log('[APP] Muting, stopping speech');
      stopSpeaking();
      clearAutoAdvanceTimer();
    } else if (currentWord && !isPaused) {
      // If unmuting, play the current word after a short delay
      console.log('[APP] Unmuting, playing current word');
      setTimeout(() => {
        const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`;
        console.log('[APP] ⚡ Speaking after unmute:', currentWord.word);
        lastSpokenWordRef.current = null; // Reset to allow speaking this word again
        speak(fullText, voiceRegion);
      }, 300); // Small delay to ensure UI is updated
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
          category={currentWord.category}
        />
      ) : (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;
