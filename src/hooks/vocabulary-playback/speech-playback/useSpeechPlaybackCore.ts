
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '../useVoiceSelection';
import { 
  useSpeechState, 
  useVoiceManager, 
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
  const { findVoice } = useVoiceManager(selectedVoice);
  const { createSpeechText } = useContentProcessor();
  const { executeSpeech } = useSpeechExecution(
    selectedVoice,
    findVoice,
    setIsSpeaking,
    isPlayingRef,
    advanceToNext,
    muted,
    paused
  );

  const playWord = useCallback(async (wordToPlay: VocabularyWord | null) => {
    // Prevent overlapping speech
    if (isPlayingRef.current) {
      console.log('[SPEECH-PLAYBACK] Speech already in progress, skipping');
      return;
    }

    // Basic checks
    if (!wordToPlay || muted || paused) {
      console.log(`[SPEECH-PLAYBACK] Cannot play word: ${!wordToPlay ? 'No word' : muted ? 'Muted' : 'Paused'}`);
      return;
    }
    
    console.log(`[SPEECH-PLAYBACK] Playing word: ${wordToPlay.word}`);
    isPlayingRef.current = true;
    
    try {
      const speechText = createSpeechText(wordToPlay);
      await executeSpeech(wordToPlay, speechText);
    } catch (error) {
      console.error("[SPEECH-PLAYBACK] Error in playWord function:", error);
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
