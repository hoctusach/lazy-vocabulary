
import { useCallback } from "react";
import { vocabularyService } from "@/services/vocabularyService";
import { stopSpeaking } from "@/utils/speech";

export const useCategoryActions = (
  setCurrentWord: React.Dispatch<React.SetStateAction<any>>,
  clearTimer: () => void,
  wordChangeInProgressRef: React.MutableRefObject<boolean>,
  lastManualActionTimeRef: React.MutableRefObject<number>,
  isChangingWordRef: React.MutableRefObject<boolean>
) => {
  // Enhanced category switching with proper cleanup
  const handleSwitchCategory = useCallback((currentCategory: string = "", nextCategory: string = "") => {
    // Fixed: Added debug logging to track category values
    console.log(`Switching category from "${currentCategory}" to "${nextCategory}" (types: ${typeof currentCategory}, ${typeof nextCategory})`);
    
    // Ensure nextCategory is a string and not "All words"
    if (typeof nextCategory !== 'string' || nextCategory === "All words") {
      console.error(`Invalid category: ${nextCategory}`);
      return;
    }
    
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
    handleSwitchCategory
  };
};
