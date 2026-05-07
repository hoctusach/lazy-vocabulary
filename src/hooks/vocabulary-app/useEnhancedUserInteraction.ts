
import { useEffect, useState, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { initializeSpeechSystem } from '@/utils/speech';
import {
  setupUserInteractionListeners,
  markUserInteraction,
  resetUserInteraction,
  loadUserInteractionState,
  hasAudioUnlockedThisSession
} from '@/utils/userInteraction';

interface UseEnhancedUserInteractionProps {
  onUserInteraction?: () => void;
  currentWord?: VocabularyWord | null;
  playCurrentWord?: () => void;
}

/**
 * Enhanced user interaction hook with improved audio unlock detection
 */
export const useEnhancedUserInteraction = ({
  onUserInteraction,
  playCurrentWord
}: UseEnhancedUserInteractionProps) => {
  const [hasInitialized, setHasInitialized] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  const handleInteraction = useCallback(async () => {
    setInteractionCount(c => c + 1);
    markUserInteraction();
    await initializeSpeechSystem();
    if (!hasInitialized) {
      setHasInitialized(true);
    }
    setIsAudioUnlocked(true);
    onUserInteraction?.();
    playCurrentWord?.();
  }, [hasInitialized, onUserInteraction, playCurrentWord]);

  useEffect(() => {
    setupUserInteractionListeners();
    const listener = () => handleInteraction();
    document.addEventListener('click', listener);
    document.addEventListener('touchstart', listener);
    document.addEventListener('keydown', listener);

    return () => {
      document.removeEventListener('click', listener);
      document.removeEventListener('touchstart', listener);
      document.removeEventListener('keydown', listener);
    };
  }, [handleInteraction]);

  // Detect prior interaction for UI state only. A browser audio unlock still
  // requires a fresh gesture in the current page session.
  useEffect(() => {
    if (loadUserInteractionState()) {
      const unlockedThisSession = hasAudioUnlockedThisSession();
      setIsAudioUnlocked(unlockedThisSession);
      setHasInitialized(unlockedThisSession);
      console.log('[USER-INTERACTION] Previous interaction detected; waiting for a fresh gesture to unlock audio');
    }
  }, []);

  useEffect(() => {
    const blocked = () => {
      setIsAudioUnlocked(false);
      setHasInitialized(false);
      resetUserInteraction();
    };
    window.addEventListener('speechblocked', blocked);
    return () => {
      window.removeEventListener('speechblocked', blocked);
    };
  }, []);

  return {
    hasInitialized,
    interactionCount,
    isAudioUnlocked
  };
};
