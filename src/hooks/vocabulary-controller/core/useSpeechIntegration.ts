
import { useState, useEffect, useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

/**
 * Speech synthesis integration with conflict prevention
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
  const lastPlayedWordRef = useRef<string | null>(null);
  const isPlayingRef = useRef(false);

  // Subscribe to speech controller state changes
  useEffect(() => {
    const unsubscribe = unifiedSpeechController.subscribe(setSpeechState);
    return unsubscribe;
  }, []);

  // Play current word with conflict prevention
  const playCurrentWord = useCallback(async () => {
    if (!currentWord || speechState.isActive || isTransitioningRef.current || isPlayingRef.current) {
      console.log('[SPEECH-INTEGRATION] Skipping play - conditions not met:', {
        hasWord: !!currentWord,
        isActive: speechState.isActive,
        isTransitioning: isTransitioningRef.current,
        isPlaying: isPlayingRef.current
      });
      return;
    }

    // Prevent duplicate plays of the same word
    if (lastPlayedWordRef.current === currentWord.word) {
      console.log('[SPEECH-INTEGRATION] Skipping - same word already played');
      return;
    }

    isPlayingRef.current = true;
    lastPlayedWordRef.current = currentWord.word;

    console.log(`[SPEECH-INTEGRATION] Playing word: ${currentWord.word}`);
    
    try {
      await unifiedSpeechController.speak(currentWord, voiceRegion);
    } catch (error) {
      console.error('[SPEECH-INTEGRATION] Error playing word:', error);
    } finally {
      isPlayingRef.current = false;
    }
  }, [currentWord, speechState.isActive, voiceRegion]);

  // Auto-play effect when word changes (with stricter conditions)
  useEffect(() => {
    if (currentWord && !isPaused && !isMuted && !speechState.isActive && !isPlayingRef.current) {
      // Only play if this is a new word
      if (lastPlayedWordRef.current !== currentWord.word) {
        console.log(`[SPEECH-INTEGRATION] New word detected: ${currentWord.word}, scheduling play`);
        
        // Small delay to ensure clean transitions, but shorter to reduce lag
        const timeout = setTimeout(() => {
          if (!isTransitioningRef.current && !isPlayingRef.current) {
            playCurrentWord();
          }
        }, 100); // Reduced from 200ms

        return () => clearTimeout(timeout);
      }
    }
  }, [currentWord, isPaused, isMuted, playCurrentWord]);

  // Reset last played word when word changes
  useEffect(() => {
    if (currentWord && lastPlayedWordRef.current !== currentWord.word) {
      console.log(`[SPEECH-INTEGRATION] Word changed from ${lastPlayedWordRef.current} to ${currentWord.word}`);
      // Don't update lastPlayedWordRef here - let playCurrentWord do it
    }
  }, [currentWord]);

  return {
    speechState,
    playCurrentWord
  };
};
