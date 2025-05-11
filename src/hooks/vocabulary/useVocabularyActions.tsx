
import { useCallback } from "react";
import { vocabularyService } from "@/services/vocabularyService";
import { VocabularyWord } from "@/types/vocabulary";
import { stopSpeaking } from "@/utils/speech";

export const useVocabularyActions = (
  setCurrentWord: React.Dispatch<React.SetStateAction<VocabularyWord | null>>,
  clearTimer: () => void,
  wordChangeInProgressRef: React.MutableRefObject<boolean>,
  lastManualActionTimeRef: React.MutableRefObject<number>,
  isChangingWordRef: React.MutableRefObject<boolean>,
  setIsPaused: React.Dispatch<React.SetStateAction<boolean>>,
  timerRef: React.MutableRefObject<number | null>,
  displayNextWord: () => void
) => {
  // Toggle pause state - simple state toggle only
  const handleTogglePause = useCallback(() => {
    setIsPaused(prevIsPaused => !prevIsPaused);
  }, [setIsPaused]);
  
  // Debounced next word handler to prevent rapid clicks
  const handleManualNext = useCallback(() => {
    // First, stop any ongoing speech to prevent UI freeze
    stopSpeaking();
    
    // Prevent multiple simultaneous word changes
    if (wordChangeInProgressRef.current) {
      console.log("Word change already in progress, ignoring manual next");
      return;
    }

    console.log("Manual next word requested");
    lastManualActionTimeRef.current = Date.now();
    clearTimer();
    
    // Set flags to prevent multiple concurrent word changes
    wordChangeInProgressRef.current = true;
    isChangingWordRef.current = true;
    
    try {
      // Get next word from vocabulary service
      const nextWord = vocabularyService.getNextWord();
      if (nextWord) {
        console.log("Found next word:", nextWord.word);
        // Set the new word
        setCurrentWord(nextWord);
      } else {
        console.warn("No next word available");
      }
    } catch (error) {
      console.error("Error getting next word:", error);
    } finally {
      // Ensure we always clear the in-progress flags after a short delay
      // to allow DOM updates to complete
      setTimeout(() => {
        wordChangeInProgressRef.current = false;
        isChangingWordRef.current = false;
      }, 200);
    }
  }, [clearTimer, setCurrentWord, wordChangeInProgressRef, lastManualActionTimeRef, isChangingWordRef]);
  
  // Enhanced category switching with proper cleanup
  const handleSwitchCategory = useCallback((currentCategory: string = "", nextCategory: string = "") => {
    console.log(`Switching category from ${currentCategory} to ${nextCategory}`);
    
    // First stop any ongoing speech and clear timers
    stopSpeaking();
    clearTimer();
    
    // Set flags to indicate we're changing words
    wordChangeInProgressRef.current = true;
    isChangingWordRef.current = true;
    
    // Switch to next sheet in vocabularyService
    const wasSuccessful = vocabularyService.switchSheet(nextCategory);
    
    if (wasSuccessful) {
      console.log(`Successfully switched to category: ${nextCategory}`);
      
      // Reset playback to the first word from the new sheet
      // We don't need to call shuffleCurrentSheet directly since switchSheet
      // already handles this internally in the WordNavigation class
      
      // Update current word to the first word from the new sheet
      const newWord = vocabularyService.getCurrentWord();
      console.log("New current word after category switch:", newWord);
      setCurrentWord(newWord);
      
      // Update last manual action time to prevent auto-advance too soon
      lastManualActionTimeRef.current = Date.now();
      
      // Store the current category in localStorage for persistence
      try {
        const buttonStates = JSON.parse(localStorage.getItem('buttonStates') || '{}');
        buttonStates.currentCategory = nextCategory;
        localStorage.setItem('buttonStates', JSON.stringify(buttonStates));
      } catch (e) {
        // Ignore localStorage errors
      }
      
    } else {
      console.error(`Failed to switch to category: ${nextCategory}`);
    }
    
    // Reset flags after a delay to ensure DOM updates complete
    setTimeout(() => {
      wordChangeInProgressRef.current = false;
      isChangingWordRef.current = false;
    }, 300);
    
  }, [clearTimer, setCurrentWord, lastManualActionTimeRef, wordChangeInProgressRef, isChangingWordRef]);

  return {
    handleTogglePause,
    handleManualNext,
    handleSwitchCategory
  };
};
