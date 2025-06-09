
import { useState, useEffect, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { useVoiceSelection } from './useVoiceSelection';
import { useWordNavigation } from './useWordNavigation';
import { useSimpleWordPlayback } from './useSimpleWordPlayback';

/**
 * Simplified vocabulary playback system
 */
export const useSimpleVocabularyPlayback = (wordList: VocabularyWord[]) => {
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  
  // Voice selection
  const { selectedVoice, toggleVoice, findVoice } = useVoiceSelection();
  
  // Word navigation
  const { currentIndex, currentWord, goToNext, goToPrevious, goToWord } = useWordNavigation(wordList);
  
  // Word playback
  const { playWord, stopPlayback, isSpeaking } = useSimpleWordPlayback(
    selectedVoice,
    findVoice,
    goToNext,
    muted,
    paused
  );

  // Auto-play effect - plays word when it changes
  useEffect(() => {
    if (currentWord && !muted && !paused) {
      console.log(`[SIMPLE-VOCABULARY] Auto-playing word: ${currentWord.word}`);
      playWord(currentWord);
    }
  }, [currentWord, muted, paused, playWord]);

  // Stop speech when muted or paused
  useEffect(() => {
    if (muted || paused) {
      console.log(`[SIMPLE-VOCABULARY] Stopping speech - muted: ${muted}, paused: ${paused}`);
      stopPlayback();
    }
  }, [muted, paused, stopPlayback]);

  // Control functions
  const toggleMute = useCallback(() => {
    console.log(`[SIMPLE-VOCABULARY] Toggling mute: ${!muted}`);
    setMuted(!muted);
  }, [muted]);

  const togglePause = useCallback(() => {
    console.log(`[SIMPLE-VOCABULARY] Toggling pause: ${!paused}`);
    setPaused(!paused);
  }, [paused]);

  const playCurrentWord = useCallback(() => {
    if (currentWord && !muted) {
      console.log(`[SIMPLE-VOCABULARY] Manually playing current word: ${currentWord.word}`);
      playWord(currentWord);
    }
  }, [currentWord, muted, playWord]);

  return {
    // State
    currentWord,
    currentIndex,
    muted,
    paused,
    isSpeaking,
    selectedVoice,
    
    // Navigation
    goToNext,
    goToPrevious,
    goToWord,
    
    // Playback controls
    playCurrentWord,
    toggleMute,
    togglePause,
    toggleVoice,
    
    // Utilities
    wordCount: wordList.length
  };
};
