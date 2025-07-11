
import React, { useEffect, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { useEnhancedUserInteraction } from '@/hooks/vocabulary-app/useEnhancedUserInteraction';

interface UserInteractionManagerProps {
  currentWord: VocabularyWord | null;
  playCurrentWord: () => void;
  onInteractionUpdate: (state: {
    hasInitialized: boolean;
    interactionCount: number;
    isAudioUnlocked: boolean;
  }) => void;
}

const UserInteractionManager: React.FC<UserInteractionManagerProps> = ({
  currentWord,
  playCurrentWord,
  onInteractionUpdate
}) => {
  const prevStateRef = useRef<string>('');

  const { hasInitialized, interactionCount, isAudioUnlocked } = useEnhancedUserInteraction({
    onUserInteraction: () => {
      // Minimal logging
    },
    currentWord,
    playCurrentWord
  });

  // Only notify parent when state actually changes
  useEffect(() => {
    const currentState = JSON.stringify({ hasInitialized, interactionCount, isAudioUnlocked });
    if (prevStateRef.current !== currentState) {
      prevStateRef.current = currentState;
      onInteractionUpdate({ hasInitialized, interactionCount, isAudioUnlocked });
    }
  }, [hasInitialized, interactionCount, isAudioUnlocked, onInteractionUpdate]);

  // This component only manages user interaction state now
  return null;
};

export default UserInteractionManager;
