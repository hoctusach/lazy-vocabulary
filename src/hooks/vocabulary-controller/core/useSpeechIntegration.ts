
import { useState, useEffect, useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

/**
 * Real speech integration with actual browser speech synthesis
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
  const lastWordRef = useRef<string | null>(null);

  // Subscribe to speech controller state changes
  useEffect(() => {
    const updateState = () => {
      setSpeechState(unifiedSpeechController.getState());
    };
    
    const interval = setInterval(updateState, 200);
    return () => clearInterval(interval);
  }, []);

  // Play current word with conflict prevention
  const playCurrentWord = useCallback(async () => {
    if (!currentWord || isTransitioningRef.current || isPlayingRef.current) {
      return;
    }

    if (isPaused || isMuted) {
      console.log('Skipping playback - paused:', isPaused, 'muted:', isMuted);
      return;
    }

    // Check if this is the same word
    if (lastWordRef.current === currentWord.word) {
      console.log('Same word, skipping playback');
      return;
    }

    lastWordRef.current = currentWord.word;
    isPlayingRef.current = true;

    try {
      console.log('Playing current word:', currentWord.word, 'region:', voiceRegion);
      const success = await unifiedSpeechController.speak(currentWord, voiceRegion);
      console.log('Speech result:', success);
    } catch (error) {
      console.error('Speech error:', error);
    } finally {
      isPlayingRef.current = false;
    }
  }, [currentWord, isPaused, isMuted, voiceRegion, isTransitioningRef]);

  // Auto-play effect when word changes
  useEffect(() => {
    if (currentWord && !isPaused && !isMuted && !speechState.isActive && !isPlayingRef.current) {
      const timeout = setTimeout(() => {
        if (!isTransitioningRef.current && !isPlayingRef.current) {
          console.log('Auto-playing word:', currentWord.word);
          playCurrentWord();
        }
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [currentWord, isPaused, isMuted, playCurrentWord, speechState.isActive]);

  // Reset last word when muted/unmuted or paused/unpaused
  useEffect(() => {
    lastWordRef.current = null;
  }, [isPaused, isMuted]);

  return {
    speechState,
    playCurrentWord
  };
};
