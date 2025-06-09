
import { useState, useEffect, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { useVoiceSelection } from './useVoiceSelection';
import { useSimpleWordNavigation } from './useSimpleWordNavigation';
import { useSimpleWordPlayback } from './useSimpleWordPlayback';

/**
 * Simplified vocabulary playback system
 */
export const useSimpleVocabularyPlayback = (wordList: VocabularyWord[]) => {
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  
  // Voice selection
  const { selectedVoice, cycleVoice, voices } = useVoiceSelection();
  
  // Find voice function
  const findVoice = useCallback((region: 'US' | 'UK') => {
    return voices.find(voice => voice.region === region)?.voice || null;
  }, [voices]);
  
  // Word navigation using the simplified hook
  const { currentIndex, currentWord, advanceToNext, goToPrevious, goToWord } = useSimpleWordNavigation(wordList);
  
  // Word playback
  const { playWord, stopPlayback, isSpeaking } = useSimpleWordPlayback(
    selectedVoice,
    findVoice,
    advanceToNext,
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

  const goToNext = useCallback(() => {
    advanceToNext();
  }, [advanceToNext]);

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
    toggleVoice: cycleVoice,
    
    // Utilities
    wordCount: wordList.length
  };
};
