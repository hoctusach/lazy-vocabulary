
import { useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

/**
 * Hook for auto-playing the current word when it changes
 */
export const useAutoPlay = (
  currentWord: VocabularyWord | null,
  muted: boolean,
  paused: boolean,
  playCurrentWord: () => void
) => {
  // Always attempt to auto-play the current word when it changes
  useEffect(() => {
    if (currentWord && !muted && !paused) {
      console.log(`Auto-playing word after state change: ${currentWord.word}`);
      
      // Small delay to ensure state is settled
      const timer = setTimeout(() => {
        playCurrentWord();
      }, 250);
      
      return () => clearTimeout(timer);
    }
  }, [currentWord, muted, paused, playCurrentWord]);
};
