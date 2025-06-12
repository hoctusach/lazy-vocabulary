
import { useState, useEffect, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

/**
 * Speech synthesis integration
 */
export const useSpeechIntegration = (
  currentWord: VocabularyWord | null,
  voiceRegion: 'US' | 'UK' | 'AU',
  isPaused: boolean,
  isMuted: boolean,
  isTransitioningRef: React.MutableRefObject<boolean>
) => {
  // Speech state from unified controller
  const [speechState, setSpeechState] = useState(unifiedSpeechController.getState());

  // Subscribe to speech controller state changes
  useEffect(() => {
    const unsubscribe = unifiedSpeechController.subscribe(setSpeechState);
    return unsubscribe;
  }, []);

  // Play current word
  const playCurrentWord = useCallback(async () => {
    if (!currentWord || speechState.isActive || isTransitioningRef.current) {
      return;
    }

    console.log(`[SPEECH-INTEGRATION] Playing word: ${currentWord.word}`);
    await unifiedSpeechController.speak(currentWord, voiceRegion);
  }, [currentWord, speechState.isActive, voiceRegion]);

  // Auto-play effect when word changes
  useEffect(() => {
    if (currentWord && !isPaused && !isMuted && !speechState.isActive) {
      // Small delay to ensure clean transitions
      const timeout = setTimeout(() => {
        if (!isTransitioningRef.current) {
          playCurrentWord();
        }
      }, 200);

      return () => clearTimeout(timeout);
    }
  }, [currentWord, isPaused, isMuted, speechState.isActive, playCurrentWord]);

  return {
    speechState,
    playCurrentWord
  };
};
