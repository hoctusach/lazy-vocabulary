
import { useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

interface UseEnhancedUserInteractionProps {
  onUserInteraction?: () => void;
  currentWord?: VocabularyWord | null;
  playCurrentWord?: () => void;
}

/**
 * Enhanced user interaction hook with improved audio unlock detection
 */
export const useEnhancedUserInteraction = ({
  onUserInteraction
}: UseEnhancedUserInteractionProps) => {
  // Immediately invoke the callback on mount
  useEffect(() => {
    onUserInteraction?.();
  }, [onUserInteraction]);

  // Without user interaction gating, audio is always unlocked
  return {
    hasInitialized: true,
    interactionCount: 0,
    isAudioUnlocked: true
  };
};
