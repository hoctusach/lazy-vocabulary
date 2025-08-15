
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

  const checkAll = (
    currentWord: VocabularyWord,
    muted: boolean,
    paused: boolean,
    isPlayInProgress: () => boolean,
    resetPlayInProgress: () => void,
    wordTransitionRef: React.MutableRefObject<boolean>
  ) => {
    if (!currentWord) {
      return { canPlay: false, reason: 'no-word' };
    }

    if (muted) {
      return { canPlay: false, reason: 'muted' };
    }

    if (paused) {
      return { canPlay: false, reason: 'paused' };
    }

    if (isPlayInProgress()) {
      resetPlayInProgress();
      return { canPlay: false, reason: 'play-in-progress' };
    }

    if (wordTransitionRef.current) {
      return { canPlay: false, reason: 'word-transition' };
    }

    return { canPlay: true, reason: null };
  };

  return { validatePreConditions, checkAll };
};
