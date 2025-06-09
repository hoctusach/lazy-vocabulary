
import { VocabularyWord } from '@/types/vocabulary';

/**
 * Hook for validating speech execution preconditions
 */
export const useSpeechValidation = () => {
  const validatePreConditions = (
    sessionId: string,
    currentWord: VocabularyWord,
    paused: boolean,
    muted: boolean,
    wordTransitionRef: React.MutableRefObject<boolean>
  ) => {
    console.log(`[SPEECH-VALIDATION-${sessionId}] Validating preconditions for: ${currentWord.word}`);
    
    if (paused || muted) {
      console.log(`[SPEECH-VALIDATION-${sessionId}] Skipping due to state - paused: ${paused}, muted: ${muted}`);
      return false;
    }

    if (wordTransitionRef.current) {
      console.log(`[SPEECH-VALIDATION-${sessionId}] Skipping due to word transition in progress`);
      return false;
    }

    return true;
  };

  const validateSpeechContent = (
    sessionId: string,
    speechableText: string,
    setPlayInProgress: (inProgress: boolean) => void,
    goToNextWord: () => void
  ) => {
    if (!speechableText || speechableText.trim().length === 0) {
      console.warn(`[SPEECH-VALIDATION-${sessionId}] No valid content to speak`);
      setPlayInProgress(false);
      setTimeout(() => goToNextWord(), 1500);
      return false;
    }
    return true;
  };

  return {
    validatePreConditions,
    validateSpeechContent
  };
};
