
import * as React from 'react';
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

/**
 * Silent speech validation hook
 */
export const useSpeechValidation = () => {
  const validatePreConditions = (
    sessionId: string,
    currentWord: VocabularyWord,
    paused: boolean,
    muted: boolean,
    wordTransitionRef: React.MutableRefObject<boolean>
  ) => {
    if (paused || muted) {
      return false;
    }

    if (wordTransitionRef.current) {
      return false;
    }

    return true;
  };

  const validateSpeechContent = (
    sessionId: string,
    speechableText: string,
    setPlayInProgress: (inProgress: boolean) => void
  ) => {
    if (!speechableText || speechableText.trim().length === 0) {
      setPlayInProgress(false);
      return false;
    }
    return true;
  };

  return {
    validatePreConditions,
    validateSpeechContent
  };
};
