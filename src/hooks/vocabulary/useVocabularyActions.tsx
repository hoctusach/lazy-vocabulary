
import { useCallback } from "react";
import { usePauseActions } from "./usePauseActions";
import { useWordNavigationActions } from "./useWordNavigation";
import { useCategoryActions } from "./useCategoryActions";
import { VocabularyWord } from "@/types/vocabulary";

export const useVocabularyActions = (
  setCurrentWord: React.Dispatch<React.SetStateAction<VocabularyWord | null>>,
  clearTimer: () => void,
  wordChangeInProgressRef: React.MutableRefObject<boolean>,
  lastManualActionTimeRef: React.MutableRefObject<number>,
  isChangingWordRef: React.MutableRefObject<boolean>,
  pauseRequestedRef: React.MutableRefObject<boolean> | undefined,
  setIsPaused: React.Dispatch<React.SetStateAction<boolean>>,
  timerRef: React.MutableRefObject<number | null>,
  displayNextWord: () => void
) => {
  // Use the pause actions hook
  const { handleTogglePause } = usePauseActions(setIsPaused);
  
  // Use the word navigation actions hook
  const { handleManualNext } = useWordNavigationActions(
    setCurrentWord,
    clearTimer,
    wordChangeInProgressRef,
    lastManualActionTimeRef,
    isChangingWordRef,
    pauseRequestedRef
  );
  
  // Use the category actions hook
  const { handleSwitchCategory } = useCategoryActions(
    setCurrentWord,
    clearTimer,
    wordChangeInProgressRef,
    lastManualActionTimeRef,
    isChangingWordRef
  );

  return {
    handleTogglePause,
    handleManualNext,
    handleSwitchCategory
  };
};
