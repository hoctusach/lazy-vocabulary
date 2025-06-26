
import * as React from 'react';
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '../../useVoiceSelection';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

/**
 * Silent speech execution hook
 */
export const useSpeechExecution = (
  selectedVoice: VoiceSelection,
  setIsSpeaking: (isSpeaking: boolean) => void,
  isPlayingRef: React.MutableRefObject<boolean>,
  advanceToNext: () => void,
  muted: boolean,
  paused: boolean
) => {
  const executeSpeech = useCallback(async (
    wordToPlay: VocabularyWord,
    speechText: string
  ): Promise<boolean> => {
    // Validate pre-conditions
    if (muted) {
      isPlayingRef.current = false;
      return false;
    }
    
    if (paused) {
      isPlayingRef.current = false;
      return false;
    }
    
    try {
      const success = await unifiedSpeechController.speak(
        wordToPlay,
        selectedVoice.region
      );

      setIsSpeaking(false);
      isPlayingRef.current = false;

      return success;
      
    } catch (error) {
      setIsSpeaking(false);
      isPlayingRef.current = false;
      
      // Always try to advance on exception to prevent getting stuck
      if (!paused && !muted) {
        setTimeout(() => advanceToNext(), 2000);
      }
      
      return false;
    }
  }, [selectedVoice, setIsSpeaking, isPlayingRef, advanceToNext, muted, paused]);

  return {
    executeSpeech
  };
};
