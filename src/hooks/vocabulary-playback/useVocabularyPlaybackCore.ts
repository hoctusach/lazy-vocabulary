
import { useState, useEffect, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { useCorePlayback, useVoiceManagement, usePlaybackControls, useWordPlayback } from './core';

/**
 * Main hook that combines all the playback functionality
 */
export const useVocabularyPlaybackCore = (wordList: VocabularyWord[]) => {
  // Basic state for current word index
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Get core playback functionality
  const { 
    isSpeaking, 
    setIsSpeaking, 
    speakingRef,
    retryAttemptsRef, 
    userInteractionRef,
    resetRetryAttempts,
    incrementRetryAttempts,
    checkSpeechSupport
  } = useCorePlayback();
  
  // Get voice management functionality
  const { 
    voices, 
    selectedVoice, 
    findVoice, 
    cycleVoice,
    allVoiceOptions
  } = useVoiceManagement();
  
  // Function to cancel any current speech and reset state
  const cancelSpeech = useCallback(() => {
    if (window.speechSynthesis) {
      console.log('Cancelling any ongoing speech');
      window.speechSynthesis.cancel();
      speakingRef.current = false;
      setIsSpeaking(false);
    }
  }, [speakingRef, setIsSpeaking]);
  
  // Get playback controls (mute/pause)
  const { 
    muted, 
    paused, 
    toggleMute, 
    togglePause 
  } = usePlaybackControls(cancelSpeech, () => {});  // We'll fix this circular reference below
  
  // Get word playback functionality
  const { 
    utteranceRef,
    currentWord, 
    playCurrentWord: playCurrentWordInternal, 
    goToNextWord 
  } = useWordPlayback(
    wordList,
    currentIndex,
    setCurrentIndex,
    muted,
    paused,
    cancelSpeech,
    findVoice,
    selectedVoice,
    userInteractionRef,
    setIsSpeaking,
    speakingRef,
    resetRetryAttempts,
    incrementRetryAttempts,
    checkSpeechSupport
  );
  
  // Ensure speech synthesis is canceled when component unmounts
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  // Effect to handle auto-play only AFTER user interaction
  useEffect(() => {
    if (currentWord && !muted && !paused && userInteractionRef.current) {
      // Small delay to ensure state is settled
      const timer = setTimeout(() => {
        console.log('Auto-playing word after state change:', currentWord.word);
        playCurrentWordInternal();
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [currentIndex, currentWord, muted, paused, playCurrentWordInternal, userInteractionRef]);
  
  return {
    currentWord,
    currentIndex,
    muted,
    paused,
    voices,
    selectedVoice,
    playCurrentWord: playCurrentWordInternal,
    goToNextWord,
    toggleMute,
    togglePause,
    cycleVoice,
    userInteractionRef,
    isSpeaking,
    allVoiceOptions
  };
};
