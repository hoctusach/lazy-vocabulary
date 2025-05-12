
import { useCallback } from "react";
import { vocabularyService } from "@/services/vocabularyService";
import { VocabularyWord } from "@/types/vocabulary";
import { stopSpeaking } from "@/utils/speech";

// The hook for next word actions
export const useWordNavigationActions = (
  setCurrentWord: React.Dispatch<React.SetStateAction<VocabularyWord | null>>,
  clearTimer: () => void,
  wordChangeInProgressRef: React.MutableRefObject<boolean>,
  lastManualActionTimeRef: React.MutableRefObject<number>,
  isChangingWordRef: React.MutableRefObject<boolean>
) => {
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

  return {
    handleManualNext
  };
};

// Create the main useWordNavigation hook that useVocabularyManager imports
export const useWordNavigation = (
  isPaused: boolean,
  setCurrentWord: React.Dispatch<React.SetStateAction<VocabularyWord | null>>,
  lastManualActionTimeRef: React.MutableRefObject<number>,
  wordChangeInProgressRef: React.MutableRefObject<boolean>,
  clearTimer: () => void
) => {
  const timerRef = React.useRef<number | null>(null);

  // Display next word with proper timing
  const displayNextWord = useCallback(() => {
    // Prevent displaying next word if paused
    if (isPaused) {
      console.log("Auto-advance paused, not displaying next word");
      return;
    }

    // Don't advance if we recently had a manual action
    const timeSinceLastManualAction = Date.now() - lastManualActionTimeRef.current;
    if (timeSinceLastManualAction < 1000) {
      console.log("Recent manual action, delaying auto-advance");
      return;
    }

    // Make sure we're not already changing a word
    if (wordChangeInProgressRef.current) {
      console.log("Word change already in progress, delaying auto-advance");
      return;
    }

    try {
      // Mark word change as in progress
      wordChangeInProgressRef.current = true;
      
      // Get next word from vocabulary service
      const nextWord = vocabularyService.getNextWord();
      if (nextWord) {
        console.log("Auto-advancing to next word:", nextWord.word);
        setCurrentWord(nextWord);
      }
    } catch (error) {
      console.error("Error in auto-advance:", error);
    } finally {
      // Reset the flag when done
      setTimeout(() => {
        wordChangeInProgressRef.current = false;
      }, 200);
    }
  }, [isPaused, lastManualActionTimeRef, setCurrentWord, wordChangeInProgressRef]);

  return { displayNextWord, timerRef };
};
