
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
  isAudioEnabled?: boolean;
}

export const useSpeechIntegration = (
  currentWord: VocabularyWord | null,
  selectedVoiceName: string,
  isPaused: boolean,
  isMuted: boolean,
  isTransitioningRef: React.MutableRefObject<boolean>,
  isAudioEnabled: boolean = false
) => {
  const [speechState, setSpeechState] = useState({
    isActive: false,
    audioUnlocked: true,
    phase: 'idle' as 'idle' | 'speaking' | 'paused'
  });

  const playCurrentWord = useCallback(async () => {
    if (!currentWord || isPaused || isMuted || isTransitioningRef.current || !isAudioEnabled) {
      console.log('[SPEECH-INTEGRATION] Cannot play word:', { 
        hasWord: !!currentWord, 
        isPaused, 
        isMuted, 
        isTransitioning: isTransitioningRef.current,
        isAudioEnabled 
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
  }, [currentWord, selectedVoiceName, isPaused, isMuted, isTransitioningRef, isAudioEnabled]);

  // Effect to trigger speech when dependencies change
  useEffect(() => {
    if (!currentWord) {
      console.log('[SPEECH-INTEGRATION] No current word, skipping speech');
      return;
    }

    if (isMuted || isPaused || !isAudioEnabled) {
      console.log('[SPEECH-INTEGRATION] Speech is muted, paused, or audio disabled, skipping speech');
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
