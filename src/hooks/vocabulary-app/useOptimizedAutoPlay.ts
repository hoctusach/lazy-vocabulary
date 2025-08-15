
import { useEffect, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

interface UseOptimizedAutoPlayProps {
  hasData: boolean;
  currentWord: VocabularyWord | null;
  hasInitialized: boolean;
  isPaused: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  isAudioUnlocked: boolean;
  playCurrentWord: () => void;
  isActive?: boolean;
}

export const useOptimizedAutoPlay = ({
  hasData,
  currentWord,
  hasInitialized,
  isPaused,
  isMuted,
  isSpeaking,
  isAudioUnlocked,
  playCurrentWord,
  isActive = true
}: UseOptimizedAutoPlayProps) => {
  const lastWordRef = useRef<string | null>(null);
  const playTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Clear any pending timeout
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }

    // Early exit conditions
    if (!hasData || !currentWord || !hasInitialized || isPaused || isMuted || isSpeaking || !isAudioUnlocked || !isActive) {
      return;
    }

    // Check if this is a new word
    const currentWordId = currentWord.word;
    if (lastWordRef.current === currentWordId) {
      return;
    }

    // Check if speech controller is already active
    const speechState = unifiedSpeechController.getState();
    if (speechState.isActive) {
      return;
    }

    lastWordRef.current = currentWordId;

    // Schedule auto-play with debouncing
    playTimeoutRef.current = window.setTimeout(() => {
      playTimeoutRef.current = null;
      
      // Final validation before playing
      if (!isPaused && !isMuted && !isSpeaking && isAudioUnlocked && currentWord) {
        playCurrentWord();
      }
    }, 800);

    return () => {
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = null;
      }
    };
  }, [hasData, currentWord?.word, hasInitialized, isPaused, isMuted, isSpeaking, isAudioUnlocked]);
};
