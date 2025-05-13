
import { useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { useVoiceSelection } from './useVoiceSelection';
import { useAudioControl } from './useAudioControl';
import { useWordNavigation } from './useWordNavigation';
import { useSpeechPlayback } from './useSpeechPlayback';

export const useVocabularyPlayback = (wordList: VocabularyWord[]) => {
  // Get voice selection functionality
  const { voices, selectedVoice, changeVoice } = useVoiceSelection();
  
  // Get audio control functionality
  const { muted, paused, utteranceRef, cancelSpeech, toggleMute, togglePause } = useAudioControl(wordList);
  
  // Set up speech playback
  const { playWord } = useSpeechPlayback(utteranceRef, selectedVoice, () => {}, muted, paused);
  
  // Set up word navigation
  const { currentWord, advanceToNext, currentIndex, setCurrentIndex } = useWordNavigation(
    wordList,
    cancelSpeech,
    muted,
    paused,
    playWord
  );

  // Override advance function for playWord to use
  const playCurrentWord = () => {
    if (currentWord) {
      playWord(currentWord);
    }
  };

  // This effect handles playing words whenever relevant state changes
  useEffect(() => {
    if (wordList.length > 0 && !muted && !paused && currentWord) {
      playCurrentWord();
    }
  }, [wordList, muted, paused, currentIndex]);
  
  // Function to go to next word on manual click
  const goToNextWord = () => {
    advanceToNext();
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Cancel any active speech on unmount
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  return {
    currentWord,
    currentIndex,
    muted,
    paused,
    voices,
    selectedVoice,
    playCurrentWord,
    advanceToNext,
    toggleMute,
    togglePause,
    goToNextWord,
    changeVoice
  };
};

export * from './useVoiceSelection';
export * from './useAudioControl';
export * from './useWordNavigation';
export * from './useSpeechPlayback';
