
import * as React from 'react';
import { useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

export const useUserInteractionEffect = (
  userInteractionRef: React.MutableRefObject<boolean>,
  currentWord: VocabularyWord | null,
  playCurrentWord: () => void,
  ensureVoicesLoaded: () => Promise<boolean>,
  onUserInteraction?: () => void
) => {
  useEffect(() => {
    if (userInteractionRef.current && currentWord) {
      ensureVoicesLoaded().then(() => {
        playCurrentWord();
      });
      onUserInteraction?.();
    }
  }, [userInteractionRef.current, currentWord, playCurrentWord, ensureVoicesLoaded, onUserInteraction]);
};
