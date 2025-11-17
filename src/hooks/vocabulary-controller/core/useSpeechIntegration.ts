
import * as React from 'react';
import { useEffect, useCallback, useState } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

interface SpeechIntegrationProps {
  currentWord: VocabularyWord | null;
  selectedVoiceName: string;
  isPaused: boolean;
  isMuted: boolean;
  isTransitioningRef: React.MutableRefObject<boolean>;
}

export const useSpeechIntegration = (
  currentWord: VocabularyWord | null,
  selectedVoiceName: string,
  isPaused: boolean,
  isMuted: boolean,
  isTransitioningRef: React.MutableRefObject<boolean>
) => {
  const [speechState, setSpeechState] = useState({
    isActive: false,
    audioUnlocked: true,
    phase: 'idle' as 'idle' | 'speaking' | 'paused'
  });

  const playCurrentWord = useCallback(async () => {
    if (!currentWord || isPaused || isTransitioningRef.current) {
      console.log('[SPEECH-INTEGRATION] Cannot play word:', {
        hasWord: !!currentWord,
        isPaused,
        isTransitioning: isTransitioningRef.current
      });
      return;
    }

    console.log('[SPEECH-INTEGRATION] Playing word:', currentWord.word);
    setSpeechState(prev => ({ ...prev, isActive: true, phase: 'speaking' }));
    
    try {
      await unifiedSpeechController.speak(currentWord, selectedVoiceName);
    } catch (error) {
      console.error('[SPEECH-INTEGRATION] Error playing word:', error);
    } finally {
      setSpeechState(prev => ({ ...prev, isActive: false, phase: 'idle' }));
    }
  }, [currentWord, selectedVoiceName, isPaused, isTransitioningRef]);

  // Effect to trigger speech when dependencies change
  useEffect(() => {
    if (!currentWord) {
      console.log('[SPEECH-INTEGRATION] No current word, skipping speech');
      return;
    }

    if (isPaused) {
      console.log('[SPEECH-INTEGRATION] Speech is paused, skipping speech');
      return;
    }

    if (isMuted) {
      console.log('[SPEECH-INTEGRATION] Muted, skipping speech trigger');
      return;
    }

    console.log('[SPEECH-INTEGRATION] Dependencies changed, attempting to speak:', currentWord.word);
    playCurrentWord();

  }, [currentWord, isMuted, isPaused, selectedVoiceName, playCurrentWord]);

  return {
    speechState,
    playCurrentWord
  };
};
