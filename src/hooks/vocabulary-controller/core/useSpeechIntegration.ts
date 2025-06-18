
import { useState, useEffect, useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

/**
 * Silent speech integration that preserves UI/UX without logging
 */
export const useSpeechIntegration = (
  currentWord: VocabularyWord | null,
  voiceRegion: 'US' | 'UK' | 'AU',
  isPaused: boolean,
  isMuted: boolean,
  isTransitioningRef: React.MutableRefObject<boolean>
) => {
  const [speechState, setSpeechState] = useState({
    isActive: false,
    audioUnlocked: true,
    phase: 'idle' as 'idle' | 'speaking' | 'paused',
    currentUtterance: null
  });
  const isPlayingRef = useRef(false);

  // Subscribe to speech controller state changes
  useEffect(() => {
    const updateState = () => {
      setSpeechState(unifiedSpeechController.getState());
    };
    
    const interval = setInterval(updateState, 100);
    return () => clearInterval(interval);
  }, []);

  // Play current word with conflict prevention
  const playCurrentWord = useCallback(async () => {
    if (!currentWord || isTransitioningRef.current || isPlayingRef.current) {
      return;
    }

    if (speechState.isActive) {
      unifiedSpeechController.stop();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    isPlayingRef.current = true;

    try {
      await unifiedSpeechController.speak(currentWord, voiceRegion);
    } catch (error) {
      // Silent error handling
    } finally {
      isPlayingRef.current = false;
    }
  }, [currentWord, speechState.isActive, voiceRegion]);

  // Auto-play effect when word changes
  useEffect(() => {
    if (currentWord && !isPaused && !isMuted && !speechState.isActive && !isPlayingRef.current) {
      const timeout = setTimeout(() => {
        if (!isTransitioningRef.current && !isPlayingRef.current) {
          playCurrentWord();
        }
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, [currentWord, isPaused, isMuted, playCurrentWord]);

  return {
    speechState,
    playCurrentWord
  };
};
