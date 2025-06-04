
import { useEffect, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { speechController } from '@/utils/speech/core/speechController';

/**
 * Hook to manage playing the word when it changes
 * Now coordinated with the centralized speech controller
 */
export const usePlayEffect = (
  currentWord: VocabularyWord | null,
  playCurrentWord: () => void
) => {
  const lastPlayedWordRef = useRef<string | null>(null);
  const playTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Clear any pending play timeout
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }

    if (!currentWord) {
      return;
    }

    const currentWordId = currentWord.word;
    
    // Only play if this is a genuinely new word
    if (lastPlayedWordRef.current === currentWordId) {
      console.log('[PLAY-EFFECT] Same word as last played, skipping');
      return;
    }

    // Check if speech is already active
    if (speechController.isActive()) {
      console.log('[PLAY-EFFECT] Speech controller already active, skipping');
      return;
    }

    console.log(`[PLAY-EFFECT] Scheduling play for new word: ${currentWord.word}`);
    lastPlayedWordRef.current = currentWordId;
    
    // Schedule play with delay to ensure everything is ready
    playTimeoutRef.current = window.setTimeout(() => {
      playTimeoutRef.current = null;
      
      // Final check before playing
      if (!speechController.isActive()) {
        console.log(`[PLAY-EFFECT] Executing play for: ${currentWord.word}`);
        playCurrentWord();
      } else {
        console.log('[PLAY-EFFECT] Speech became active, skipping execution');
      }
    }, 250);

    return () => {
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = null;
      }
    };
  }, [currentWord, playCurrentWord]);
};
