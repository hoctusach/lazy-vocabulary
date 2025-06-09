
import { useState, useEffect, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { useVoiceSelection } from './useVoiceSelection';
import { useSimpleWordNavigation } from './useSimpleWordNavigation';
import { useSimpleWordPlayback } from './useSimpleWordPlayback';
import { simpleSpeechController } from '@/utils/speech/simpleSpeechController';

/**
 * Simplified vocabulary playback system with improved pause handling
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

  // Auto-play effect - plays word when it changes (but respects pause state)
  useEffect(() => {
    console.log(`[SIMPLE-VOCABULARY] Word changed effect - word: ${currentWord?.word}, muted: ${muted}, paused: ${paused}`);
    
    if (currentWord && !muted && !paused) {
      console.log(`[SIMPLE-VOCABULARY] Auto-playing word: ${currentWord.word}`);
      playWord(currentWord);
    } else if (currentWord && paused) {
      console.log(`[SIMPLE-VOCABULARY] Word ready but paused: ${currentWord.word}`);
    }
  }, [currentWord, muted, paused, playWord]);

  // Handle pause state changes
  useEffect(() => {
    console.log(`[SIMPLE-VOCABULARY] Pause state changed - paused: ${paused}, muted: ${muted}`);
    
    if (paused) {
      console.log('[SIMPLE-VOCABULARY] Pausing speech controller');
      simpleSpeechController.pause();
    } else if (!muted && currentWord) {
      console.log('[SIMPLE-VOCABULARY] Resuming - attempting to play current word');
      // When unpausing, play the current word
      setTimeout(() => {
        if (!paused && !muted && currentWord) {
          playWord(currentWord);
        }
      }, 100);
    }
  }, [paused, muted, currentWord, playWord]);

  // Handle mute state changes
  useEffect(() => {
    if (muted) {
      console.log(`[SIMPLE-VOCABULARY] Muted - stopping speech`);
      stopPlayback();
    } else if (!paused && currentWord) {
      console.log(`[SIMPLE-VOCABULARY] Unmuted - playing current word`);
      setTimeout(() => {
        if (!muted && !paused && currentWord) {
          playWord(currentWord);
        }
      }, 100);
    }
  }, [muted, paused, currentWord, playWord, stopPlayback]);

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
    if (currentWord && !muted && !paused) {
      console.log(`[SIMPLE-VOCABULARY] Manually playing current word: ${currentWord.word}`);
      playWord(currentWord);
    } else {
      console.log(`[SIMPLE-VOCABULARY] Cannot play current word - muted: ${muted}, paused: ${paused}, hasWord: ${!!currentWord}`);
    }
  }, [currentWord, muted, paused, playWord]);

  const goToNext = useCallback(() => {
    console.log('[SIMPLE-VOCABULARY] Manual next word requested');
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
