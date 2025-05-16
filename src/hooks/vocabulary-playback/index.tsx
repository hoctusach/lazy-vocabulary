
import { useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { useVoiceSelection } from './useVoiceSelection';
import { useAudioControl } from './useAudioControl';
import { useWordNavigation } from './useWordNavigation';
import { useSpeechPlayback } from './useSpeechPlayback';

export const useVocabularyPlayback = (wordList: VocabularyWord[]) => {
  // Get voice selection functionality - now with cycling through 4 voices
  const { voices, selectedVoice, cycleVoice, allVoiceOptions } = useVoiceSelection();
  
  // Get audio control functionality
  const { muted, paused, utteranceRef, cancelSpeech, toggleMute, togglePause } = useAudioControl(wordList);
  
  // Get word navigation, passing onNextWord handler
  const { currentWord, advanceToNext, currentIndex, setCurrentIndex, userInteractionRef } = useWordNavigation(
    wordList,
    cancelSpeech,
    muted,
    paused,
    (word) => {}  // We'll handle playback separately to avoid circular dependencies
  );
  
  // Set up speech playback
  const { playWord } = useSpeechPlayback(utteranceRef, selectedVoice, advanceToNext, muted, paused);

  // Function to go to next word on manual click
  const goToNextWord = () => {
    // Mark that we've had user interaction
    userInteractionRef.current = true;
    advanceToNext();
  };
  
  // This effect handles playing words whenever relevant state changes
  useEffect(() => {
    if (wordList.length > 0 && !muted && !paused && currentWord && userInteractionRef.current) {
      console.log(`Playing current word (index ${currentIndex}): ${currentWord.word}`);
      playWord(currentWord);
    }
  }, [wordList, muted, paused, currentIndex, currentWord, userInteractionRef.current, playWord]);
  
  // Function to play the current word, used for manual play
  const playCurrentWord = () => {
    // Mark that we've had user interaction
    userInteractionRef.current = true;
    
    if (currentWord) {
      console.log(`Manual play requested for: ${currentWord.word}`);
      playWord(currentWord);
    }
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
    cycleVoice,
    allVoiceOptions,
    userInteractionRef
  };
};

export * from './useVoiceSelection';
export * from './useAudioControl';
export * from './useWordNavigation';
export * from './useSpeechPlayback';
