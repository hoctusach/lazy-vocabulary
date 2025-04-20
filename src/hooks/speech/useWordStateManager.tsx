
import { useRef, useState } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

export const useWordStateManager = (currentWord: VocabularyWord | null) => {
  const lastWordIdRef = useRef<string | null>(null);
  const [wordFullySpoken, setWordFullySpoken] = useState(false);
  const speakAttemptCountRef = useRef(0);
  const currentWordRef = useRef<VocabularyWord | null>(null);
  const speechLockRef = useRef(false);
  const wordChangeInProgressRef = useRef(false);

  return {
    lastWordIdRef,
    wordFullySpoken,
    setWordFullySpoken,
    speakAttemptCountRef,
    currentWordRef,
    speechLockRef,
    wordChangeInProgressRef
  };
};
