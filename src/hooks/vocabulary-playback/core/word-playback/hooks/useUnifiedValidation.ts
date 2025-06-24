
import * as React from 'react';
import { VocabularyWord } from '@/types/vocabulary';

export const useUnifiedValidation = () => {
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

  return { validatePreConditions };
};
