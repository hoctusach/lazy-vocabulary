
import { useState, useEffect, useCallback, useRef } from 'react';
import { getVoiceRegionFromStorage } from '@/utils/speech/core/speechSettings';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

/**
 * Unified Vocabulary Controller - Single source of truth for vocabulary state
 * Fixed version with proper auto-advance timer management to prevent fast playback
 */
export const useUnifiedVocabularyController = () => {
  // Core vocabulary state
  const [wordList, setWordList] = useState<VocabularyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Derive the current word immediately to avoid reference errors in callbacks
  const currentWord = wordList[currentIndex] || null;
  const [hasData, setHasData] = useState(false);
  
  // Control state
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const initialRegion = getVoiceRegionFromStorage();
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK' | 'AU'>(initialRegion);

  // Persist voice region whenever it changes
  useEffect(() => {
    try {
      const storedStates = localStorage.getItem('buttonStates');
      const states = storedStates ? JSON.parse(storedStates) : {};
      states.voiceRegion = voiceRegion;
      localStorage.setItem('buttonStates', JSON.stringify(states));
    } catch (error) {
      console.error('Error saving voice region to localStorage:', error);
    }
  }, [voiceRegion]);
  
  // Speech state from unified controller
  const [speechState, setSpeechState] = useState(unifiedSpeechController.getState());
  
  // Prevent race conditions and manage timers
  const isTransitioningRef = useRef(false);
  const lastWordChangeRef = useRef(Date.now());
  const autoAdvanceTimerRef = useRef<number | null>(null);

  // Clear any existing auto-advance timer
  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
      console.log('[UNIFIED-CONTROLLER] Auto-advance timer cleared');
    }
  }, []);

  // Schedule auto-advance with proper cleanup
  const scheduleAutoAdvance = useCallback((delay: number = 1500) => {
    // Always clear existing timer first
    clearAutoAdvanceTimer();
    
    if (isPaused || isMuted) {
      console.log('[UNIFIED-CONTROLLER] Skipping auto-advance - paused or muted');
      return;
    }

    console.log(`[UNIFIED-CONTROLLER] Scheduling auto-advance in ${delay}ms`);
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      autoAdvanceTimerRef.current = null;
      if (!isPaused && !isMuted && !isTransitioningRef.current) {
        console.log('[UNIFIED-CONTROLLER] Auto-advance triggered');
        goToNext();
      }
    }, delay);
  }, [isPaused, isMuted]);

  // Subscribe to speech controller state changes
  useEffect(() => {
    const unsubscribe = unifiedSpeechController.subscribe(setSpeechState);
    return unsubscribe;
  }, []);

  // Load initial data
  useEffect(() => {
    console.log('[UNIFIED-CONTROLLER] Loading initial vocabulary data');
    
    const loadData = () => {
      try {
        const words = vocabularyService.getWordList();
        console.log(`[UNIFIED-CONTROLLER] Loaded ${words.length} words`);
        
        setWordList(words);
        setHasData(words.length > 0);
        
        if (words.length > 0) {
          setCurrentIndex(0);
        }
      } catch (error) {
        console.error('[UNIFIED-CONTROLLER] Error loading vocabulary data:', error);
        setHasData(false);
      }
    };

    loadData();

    // Subscribe to vocabulary changes
    const handleVocabularyChange = () => {
      console.log('[UNIFIED-CONTROLLER] Vocabulary data changed, reloading');
      clearAutoAdvanceTimer(); // Clear timer when data changes
      loadData();
    };

    vocabularyService.addVocabularyChangeListener(handleVocabularyChange);
    
    return () => {
      vocabularyService.removeVocabularyChangeListener(handleVocabularyChange);
      clearAutoAdvanceTimer(); // Clean up on unmount
    };
  }, [clearAutoAdvanceTimer]);

  // Set up word completion callback with fixed auto-advance
  useEffect(() => {
    const handleWordComplete = () => {
      if (isTransitioningRef.current) {
        console.log('[UNIFIED-CONTROLLER] Word transition in progress, skipping auto-advance');
        return;
      }
      
      console.log('[UNIFIED-CONTROLLER] Word completed, scheduling auto-advance');
      scheduleAutoAdvance();
    };

    unifiedSpeechController.setWordCompleteCallback(handleWordComplete);
    
    return () => {
      unifiedSpeechController.setWordCompleteCallback(null);
    };
  }, [scheduleAutoAdvance]);

  // Go to next word with proper timer management
  const goToNext = useCallback(() => {
    if (isTransitioningRef.current || wordList.length === 0) {
      console.log('[UNIFIED-CONTROLLER] Cannot go to next - transitioning or no words');
      return;
    }

    console.log('[UNIFIED-CONTROLLER] Going to next word', {
      from: currentWord?.word,
      index: currentIndex,
      total: wordList.length
    });
    isTransitioningRef.current = true;
    lastWordChangeRef.current = Date.now();

    // CRITICAL: Clear auto-advance timer before any word transition
    clearAutoAdvanceTimer();

    // Stop current speech
    unifiedSpeechController.stop();

    // Move to next word
    setCurrentIndex(prevIndex => {
      const nextIndex = (prevIndex + 1) % wordList.length;
      console.log(`[UNIFIED-CONTROLLER] Moving from word ${prevIndex} to ${nextIndex}`);
      return nextIndex;
    });

    // Clear transition flag after brief delay
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 100);
  }, [wordList.length, clearAutoAdvanceTimer]);

  // Play current word
  const playCurrentWord = useCallback(async () => {
    if (!currentWord || speechState.isActive || isTransitioningRef.current) {
      return;
    }

    console.log(`[UNIFIED-CONTROLLER] Playing word: ${currentWord.word}`);
    await unifiedSpeechController.speak(currentWord, voiceRegion);
  }, [currentWord, speechState.isActive, voiceRegion]);

  // Auto-play effect when word changes
  useEffect(() => {
    if (currentWord && !isPaused && !isMuted && !speechState.isActive) {
      // Small delay to ensure clean transitions
      const timeout = setTimeout(() => {
        if (!isTransitioningRef.current) {
          playCurrentWord();
        }
      }, 200);

      return () => clearTimeout(timeout);
    }
  }, [currentWord, isPaused, isMuted, speechState.isActive, playCurrentWord]);

  // Control functions with proper timer management
  const togglePause = useCallback(() => {
    const newPaused = !isPaused;
    console.log(`[UNIFIED-CONTROLLER] Toggling pause: ${newPaused}`);
    
    // Clear auto-advance timer when pausing
    if (newPaused) {
      clearAutoAdvanceTimer();
    }
    
    setIsPaused(newPaused);
    
    if (newPaused) {
      unifiedSpeechController.pause();
    } else {
      unifiedSpeechController.resume();
      // Resume playback if needed
      if (currentWord && !isMuted) {
        setTimeout(() => playCurrentWord(), 100);
      }
    }
  }, [isPaused, currentWord, isMuted, playCurrentWord, clearAutoAdvanceTimer]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    console.log(`[UNIFIED-CONTROLLER] Toggling mute: ${newMuted}`);
    
    // Clear auto-advance timer when muting
    if (newMuted) {
      clearAutoAdvanceTimer();
    }
    
    setIsMuted(newMuted);
    unifiedSpeechController.setMuted(newMuted);
    
    // Resume playback if unmuting
    if (!newMuted && !isPaused && currentWord) {
      setTimeout(() => playCurrentWord(), 100);
    } else if (newMuted) {
      // When muted, schedule auto-advance to continue cycling
      scheduleAutoAdvance(3000);
    }
  }, [isMuted, isPaused, currentWord, playCurrentWord, clearAutoAdvanceTimer, scheduleAutoAdvance]);

  const toggleVoice = useCallback(() => {
    const regions: ('US' | 'UK' | 'AU')[] = ['US', 'UK', 'AU'];
    const currentRegionIndex = regions.indexOf(voiceRegion);
    const nextRegion = regions[(currentRegionIndex + 1) % regions.length];
    
    console.log(`[UNIFIED-CONTROLLER] Changing voice from ${voiceRegion} to ${nextRegion}`);
    setVoiceRegion(nextRegion);
    
    // Stop current speech and restart with new voice
    if (speechState.isActive) {
      unifiedSpeechController.stop();
      if (currentWord && !isPaused && !isMuted) {
        setTimeout(() => playCurrentWord(), 200);
      }
    }
  }, [voiceRegion, speechState.isActive, currentWord, isPaused, isMuted, playCurrentWord]);

  const switchCategory = useCallback(() => {
    console.log('[UNIFIED-CONTROLLER] Switching category');
    
    // Clear auto-advance timer before category switch
    clearAutoAdvanceTimer();
    
    // Stop current speech
    unifiedSpeechController.stop();
    
    // Switch to next category
    const nextCategory = vocabularyService.nextSheet();
    console.log(`[UNIFIED-CONTROLLER] Switched to category: ${nextCategory}`);
    
    // Data will be reloaded via the vocabulary change listener
  }, [clearAutoAdvanceTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAutoAdvanceTimer();
    };
  }, [clearAutoAdvanceTimer]);

  return {
    // Data state
    currentWord,
    hasData,
    currentCategory: vocabularyService.getCurrentSheetName(),
    
    // Control state
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking: speechState.isActive,
    
    // Actions
    goToNext,
    togglePause,
    toggleMute,
    toggleVoice,
    switchCategory,
    playCurrentWord
  };
};
