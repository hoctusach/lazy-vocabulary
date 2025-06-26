
import * as React from 'react';
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '../useVoiceSelection';
import {
  useSpeechState,
  useContentProcessor,
  useSpeechExecution
} from './core';

export const useSpeechPlaybackCore = (
  utteranceRef: React.MutableRefObject<SpeechSynthesisUtterance | null>,
  selectedVoice: VoiceSelection,
  advanceToNext: () => void,
  muted: boolean,
  paused: boolean
) => {
  // Use our refactored hooks
  const { isSpeaking, setIsSpeaking, isPlayingRef } = useSpeechState();
  const { createSpeechText } = useContentProcessor();
  const { executeSpeech } = useSpeechExecution(
    selectedVoice,
    setIsSpeaking,
    isPlayingRef,
    advanceToNext,
    muted,
    paused,
    selectedVoice.label
  );

  const playWord = useCallback(async (wordToPlay: VocabularyWord | null) => {
    // Prevent overlapping speech
    if (isPlayingRef.current) {
      return;
    }

    // Basic checks
    if (!wordToPlay || muted || paused) {
      return;
    }
    
    isPlayingRef.current = true;
    
    try {
      const speechText = createSpeechText(wordToPlay);
      await executeSpeech(wordToPlay, speechText);
    } catch (error) {
      setIsSpeaking(false);
      isPlayingRef.current = false;
      if (!paused && !muted) {
        setTimeout(() => advanceToNext(), 2000);
      }
    }
  }, [selectedVoice, advanceToNext, muted, paused, isPlayingRef, createSpeechText, executeSpeech, setIsSpeaking]);
  
  return {
    playWord,
    isSpeaking
  };
};
