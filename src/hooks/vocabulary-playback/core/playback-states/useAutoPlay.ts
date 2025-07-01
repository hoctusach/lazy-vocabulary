
import { useEffect, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { speechController } from '@/utils/speech/core/speechController';
import { hasUserInteracted } from '@/utils/userInteraction';
import { toast } from 'sonner';

/**
 * Hook for auto-playing the current word when it changes
 * Now with proper coordination to prevent multiple triggers
 */
export const useAutoPlay = (
  currentWord: VocabularyWord | null,
  muted: boolean,
  paused: boolean,
  playCurrentWord: () => void
) => {
  const lastWordRef = useRef<string | null>(null);
  const prevMutedRef = useRef(muted);
  const prevPausedRef = useRef(paused);
  const autoPlayTimeoutRef = useRef<number | null>(null);

  // Reset lastWordRef when unmuting
  useEffect(() => {
    if (prevMutedRef.current && !muted) {
      lastWordRef.current = null;
    }
    prevMutedRef.current = muted;
  }, [muted]);

  // Reset lastWordRef when unpausing
  useEffect(() => {
    if (prevPausedRef.current && !paused) {
      lastWordRef.current = null;
    }
    prevPausedRef.current = paused;
  }, [paused]);

  // Auto-play effect with proper coordination
  useEffect(() => {
    // Clear any pending auto-play
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }

    // Only proceed if we have a word and conditions are right
    if (!currentWord || muted || paused) {
      return;
    }

    // Check if this is actually a new word
    const currentWordId = currentWord.word;
    if (lastWordRef.current === currentWordId) {
      console.log('[AUTO-PLAY] Same word, skipping auto-play');
      return;
    }

    // Check if speech controller is already active
    if (speechController.isActive()) {
      console.log('[AUTO-PLAY] Speech controller already active, skipping');
      return;
    }

    console.log(`[AUTO-PLAY] Scheduling auto-play for: ${currentWord.word}`);
    lastWordRef.current = currentWordId;
    
    // Schedule auto-play with a delay to ensure state is settled
    autoPlayTimeoutRef.current = window.setTimeout(() => {
      autoPlayTimeoutRef.current = null;
      
      // Double-check conditions before playing
      if (!hasUserInteracted()) {
        toast.error('Tap to enable audio playback');
        return;
      }
      if (!muted && !paused && !speechController.isActive()) {
        console.log(`[AUTO-PLAY] Executing auto-play for: ${currentWord.word}`);
        playCurrentWord();
      } else {
        console.log('[AUTO-PLAY] Conditions changed, skipping execution');
      }
    }, 400); // Longer delay to prevent race conditions
    
    return () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
        autoPlayTimeoutRef.current = null;
      }
    };
  }, [currentWord, muted, paused, playCurrentWord]);

  // Reset tracking when word actually changes
  useEffect(() => {
    if (currentWord) {
      const currentWordId = currentWord.word;
      if (lastWordRef.current !== currentWordId) {
        lastWordRef.current = currentWordId;
      }
    }
  }, [currentWord?.word]);
};
