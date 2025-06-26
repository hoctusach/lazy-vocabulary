
import * as React from 'react';
import { useEffect, useCallback, useState } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceRegion } from '@/types/speech';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

interface SpeechIntegrationProps {
  currentWord: VocabularyWord | null;
  voiceRegion: VoiceRegion;
  voiceVariant: string;
  isPaused: boolean;
  isMuted: boolean;
  isTransitioningRef: React.MutableRefObject<boolean>;
}

export const useSpeechIntegration = (
  currentWord: VocabularyWord | null,
  voiceRegion: VoiceRegion,
  voiceVariant: string,
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
    if (!currentWord || isPaused || isMuted || isTransitioningRef.current) {
      console.log('[SPEECH-INTEGRATION] Cannot play word:', { 
        hasWord: !!currentWord, 
        isPaused, 
        isMuted, 
        isTransitioning: isTransitioningRef.current 
      });
      return;
    }

    console.log('[SPEECH-INTEGRATION] Playing word:', currentWord.word);
    setSpeechState(prev => ({ ...prev, isActive: true, phase: 'speaking' }));
    
    try {
      await unifiedSpeechController.speak(currentWord, voiceRegion, voiceVariant);
    } catch (error) {
      console.error('[SPEECH-INTEGRATION] Error playing word:', error);
    } finally {
      setSpeechState(prev => ({ ...prev, isActive: false, phase: 'idle' }));
    }
  }, [currentWord, voiceRegion, voiceVariant, isPaused, isMuted, isTransitioningRef]);

  // Effect to trigger speech when dependencies change
  useEffect(() => {
    if (!currentWord) {
      console.log('[SPEECH-INTEGRATION] No current word, skipping speech');
      return;
    }

    if (isMuted || isPaused) {
      console.log('[SPEECH-INTEGRATION] Speech is muted or paused, skipping speech');
      return;
    }

    console.log('[SPEECH-INTEGRATION] Dependencies changed, attempting to speak:', currentWord.word);
    playCurrentWord();

  }, [currentWord, isMuted, isPaused, voiceRegion, voiceVariant, playCurrentWord]);

  return {
    speechState,
    playCurrentWord
  };
};
