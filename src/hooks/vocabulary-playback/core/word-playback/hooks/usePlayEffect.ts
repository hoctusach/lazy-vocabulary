
import { useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

/**
 * Hook to manage auto-playing the word when it changes
 */
export const usePlayEffect = (
  currentWord: VocabularyWord | null,
  playCurrentWord: () => void
) => {
  // Auto-play on word change - no longer relying on user interaction flag
  useEffect(() => {
    if (currentWord) {
      console.log(`Auto-playing word after change: ${currentWord.word}`);
      const timerId = setTimeout(() => {
        playCurrentWord();
      }, 200);
      return () => clearTimeout(timerId);
    }
  }, [currentWord, playCurrentWord]);
};
