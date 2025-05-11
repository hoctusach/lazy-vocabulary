
import { useCallback } from "react";
import { vocabularyService } from "@/services/vocabularyService";
import { VocabularyWord } from "@/types/vocabulary";

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
  // Toggle pause state
  const handleTogglePause = useCallback(() => {
    setIsPaused(prevIsPaused => !prevIsPaused);
  }, [setIsPaused]);
  
  // Handle manual next word request
  const handleManualNext = useCallback(() => {
    if (wordChangeInProgressRef.current) {
      console.log("Word change already in progress, ignoring manual next");
      return;
    }

    console.log("Manual next word requested");
    lastManualActionTimeRef.current = Date.now();
    clearTimer();
    
    // Set flag to prevent multiple concurrent word changes
    wordChangeInProgressRef.current = true;
    isChangingWordRef.current = true;
    
    // Display next word with small delay to allow state updates
    setTimeout(() => {
      displayNextWord();
      wordChangeInProgressRef.current = false;
      isChangingWordRef.current = false;
    }, 100);
  }, [displayNextWord, clearTimer, wordChangeInProgressRef, lastManualActionTimeRef, isChangingWordRef]);
  
  // Handle category switching
  const handleSwitchCategory = useCallback((currentCategory: string = "", nextCategory: string = "") => {
    console.log(`Switching category from ${currentCategory} to ${nextCategory}`);
    clearTimer();
    
    // Switch to next sheet in vocabularyService
    const wasSuccessful = vocabularyService.switchSheet(nextCategory);
    
    if (wasSuccessful) {
      console.log(`Successfully switched to category: ${nextCategory}`);
      
      // Update current word to the first word from the new sheet
      const newWord = vocabularyService.getCurrentWord();
      console.log("New current word:", newWord);
      setCurrentWord(newWord);
      
      // Update last manual action time
      lastManualActionTimeRef.current = Date.now();
    } else {
      console.error(`Failed to switch to category: ${nextCategory}`);
    }
  }, [clearTimer, setCurrentWord, lastManualActionTimeRef]);

  return {
    handleTogglePause,
    handleManualNext,
    handleSwitchCategory
  };
};
