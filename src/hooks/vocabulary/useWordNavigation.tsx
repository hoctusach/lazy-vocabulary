
import { useCallback } from "react";
import { vocabularyService } from "@/services/vocabularyService";
import { VocabularyWord } from "@/types/vocabulary";
import { stopSpeaking } from "@/utils/speech";

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
