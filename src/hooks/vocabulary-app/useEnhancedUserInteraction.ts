
import { useEffect, useState, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { initializeSpeechSystem } from '@/utils/speech';

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
    setInteractionCount((c) => c + 1);
    if (!hasInitialized) {
      await initializeSpeechSystem();
      setHasInitialized(true);
    }
    setIsAudioUnlocked(true);
    onUserInteraction?.();
    playCurrentWord?.();
  }, [hasInitialized, onUserInteraction, playCurrentWord]);

  useEffect(() => {
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

  useEffect(() => {
    const blocked = () => setIsAudioUnlocked(false);
    const resume = () => handleInteraction();
    window.addEventListener('speechblocked', blocked);
    window.addEventListener('resume-speech', resume);
    return () => {
      window.removeEventListener('speechblocked', blocked);
      window.removeEventListener('resume-speech', resume);
    };
  }, [handleInteraction]);

  return {
    hasInitialized,
    interactionCount,
    isAudioUnlocked
  };
};
