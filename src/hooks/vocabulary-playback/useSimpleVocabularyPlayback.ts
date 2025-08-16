
import { useState, useEffect, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { useVoiceSelection } from './useVoiceSelection';
import { useSimpleWordNavigation } from './useSimpleWordNavigation';
import { useSimpleWordPlayback } from './useSimpleWordPlayback';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

/**
 * Simplified vocabulary playback with immediate pause response
 */
export const useSimpleVocabularyPlayback = (wordList: VocabularyWord[]) => {
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  
  // Voice selection
  const { selectedVoice, cycleVoice, voices } = useVoiceSelection();
  
  // Find voice function
  const findVoice = useCallback((region: 'US' | 'UK' | 'AU') => {
    return voices.find(voice => voice.region === region)?.voice || null;
  }, [voices]);
  
  // Word navigation using the simplified hook
  const { currentIndex, currentWord, advanceToNext, goToPrevious, goToWord } = useSimpleWordNavigation(wordList);
  
  // Word playback
  const { playWord, isSpeaking } = useSimpleWordPlayback(
    selectedVoice,
    findVoice,
    advanceToNext,
    muted,
    paused
  );

  // Enhanced debug logging for state synchronization
  console.log('[SIMPLE-VOCABULARY] === Playback State Debug ===');
  console.log('[SIMPLE-VOCABULARY] Current state:', {
    currentIndex,
    currentWord: currentWord?.word || 'null',
    wordListLength: wordList?.length || 0,
    muted,
    paused,
    isSpeaking
  });

  // Auto-play effect - plays word when it changes (but respects pause state)
  useEffect(() => {
    console.log(`[SIMPLE-VOCABULARY] Word changed effect - word: ${currentWord?.word}, muted: ${muted}, paused: ${paused}`);

    if (currentWord && !paused) {
      console.log(`[SIMPLE-VOCABULARY] Auto-playing word: ${currentWord.word}`);
      playWord(currentWord);
    } else if (currentWord && paused) {
      console.log(`[SIMPLE-VOCABULARY] Word ready but paused: ${currentWord.word}`);
    }
  }, [currentWord, muted, paused, playWord]);

  // Handle pause state changes with immediate effect
  useEffect(() => {
    console.log(`[SIMPLE-VOCABULARY] Pause state changed - paused: ${paused}, muted: ${muted}`);

    if (paused) {
      console.log('[SIMPLE-VOCABULARY] ✓ Pausing speech controller immediately');
      unifiedSpeechController.pause();
    } else {
      console.log('[SIMPLE-VOCABULARY] ✓ Resuming from pause');

      // Resume the controller
      unifiedSpeechController.resume();

      // Play current word immediately after resume
      if (currentWord) {
        console.log('[SIMPLE-VOCABULARY] Playing current word after resume');
        // Small delay to ensure resume is processed
        setTimeout(() => {
          if (!paused && currentWord) {
            playWord(currentWord);
          }
        }, 100);
      }
    }
  }, [paused, currentWord, playWord, muted]);


  // Control functions
  const toggleMute = useCallback(() => {
    const newMuted = !muted;
    console.log(`[SIMPLE-VOCABULARY] ✓ Toggling mute: ${newMuted}`);
    setMuted(newMuted);
    unifiedSpeechController.setMuted(newMuted);
    if (!newMuted && !paused && currentWord) {
      playWord(currentWord);
    }
  }, [muted, paused, currentWord, playWord]);

  const togglePause = useCallback(() => {
    const newPaused = !paused;
    console.log(`[SIMPLE-VOCABULARY] ✓ Toggling pause: ${newPaused}`);
    
    // Update state immediately for responsive UI
    setPaused(newPaused);
    
    // The useEffect above will handle the actual pause/resume logic
  }, [paused]);

  const playCurrentWord = useCallback(() => {
    if (currentWord && !paused) {
      console.log(`[SIMPLE-VOCABULARY] ✓ Manually playing current word: ${currentWord.word}`);
      playWord(currentWord);
    } else {
      console.log(`[SIMPLE-VOCABULARY] ✗ Cannot play current word - paused: ${paused}, hasWord: ${!!currentWord}, muted: ${muted}`);
    }
  }, [currentWord, paused, playWord, muted]);

  const goToNext = useCallback(() => {
    console.log('[SIMPLE-VOCABULARY] ✓ Manual next word requested');
    advanceToNext();
  }, [advanceToNext]);

  // Additional state synchronization logging
  useEffect(() => {
    console.log('[SIMPLE-VOCABULARY] === State Sync Check ===');
    console.log('[SIMPLE-VOCABULARY] Word list changed or index changed:', {
      wordListLength: wordList?.length || 0,
      currentIndex,
      computedWord: wordList?.[currentIndex]?.word || 'null',
      currentWordFromHook: currentWord?.word || 'null',
      isInSync: (wordList?.[currentIndex]?.word || null) === (currentWord?.word || null)
    });
  }, [wordList, currentIndex, currentWord]);

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
