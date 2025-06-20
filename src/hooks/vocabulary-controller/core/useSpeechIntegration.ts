
import { useState, useEffect, useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';
import { ensureVoicesLoaded } from '@/utils/speech/voiceLoader';

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
  const voicesLoadedRef = useRef(false);

  // Initialize voices on mount
  useEffect(() => {
    const initVoices = async () => {
      try {
        await ensureVoicesLoaded();
        voicesLoadedRef.current = true;
        console.log('Speech voices initialized successfully');
      } catch (error) {
        console.error('Failed to initialize speech voices:', error);
      }
    };

    initVoices();
  }, []);

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

    if (!voicesLoadedRef.current) {
      console.log('Voices not loaded yet, waiting...');
      await ensureVoicesLoaded();
      voicesLoadedRef.current = true;
    }

    if (speechState.isActive) {
      unifiedSpeechController.stop();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

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
  }, [currentWord, speechState.isActive, voiceRegion]);

  // Auto-play effect when word changes
  useEffect(() => {
    if (currentWord && !isPaused && !isMuted && !speechState.isActive && !isPlayingRef.current && voicesLoadedRef.current) {
      const timeout = setTimeout(() => {
        if (!isTransitioningRef.current && !isPlayingRef.current) {
          console.log('Auto-playing word:', currentWord.word);
          playCurrentWord();
        }
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [currentWord, isPaused, isMuted, playCurrentWord, speechState.isActive]);

  return {
    speechState,
    playCurrentWord
  };
};
