
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { useAutoPlay } from '@/hooks/vocabulary-playback/core/playback-states/useAutoPlay';

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
  const guard = useCallback(() => {
    return hasData && hasInitialized && isAudioUnlocked && !isSpeaking && isActive;
  }, [hasData, hasInitialized, isAudioUnlocked, isSpeaking, isActive]);

  useAutoPlay(currentWord, isMuted, isPaused, playCurrentWord, {
    guard,
    delayMs: 800
  });
};
