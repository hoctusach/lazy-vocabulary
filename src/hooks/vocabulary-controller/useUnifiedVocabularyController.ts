
import { useState, useEffect, useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

/**
 * Unified Vocabulary Controller - Single source of truth for vocabulary state
 * Replaces all fragmented controller hooks and ensures consistent state management
 */
export const useUnifiedVocabularyController = () => {
  // Core vocabulary state
  const [wordList, setWordList] = useState<VocabularyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasData, setHasData] = useState(false);
  
  // Control state
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK' | 'AU'>('US');
  
  // Speech state from unified controller
  const [speechState, setSpeechState] = useState(unifiedSpeechController.getState());
  
  // Prevent race conditions
  const isTransitioningRef = useRef(false);
  const lastWordChangeRef = useRef(Date.now());

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
      loadData();
    };

    vocabularyService.addVocabularyChangeListener(handleVocabularyChange);
    
    return () => {
      vocabularyService.removeVocabularyChangeListener(handleVocabularyChange);
    };
  }, []);

  // Set up word completion callback
  useEffect(() => {
    const handleWordComplete = () => {
      if (isTransitioningRef.current) {
        console.log('[UNIFIED-CONTROLLER] Word transition in progress, skipping');
        return;
      }
      
      goToNext();
    };

    unifiedSpeechController.setWordCompleteCallback(handleWordComplete);
    
    return () => {
      unifiedSpeechController.setWordCompleteCallback(null);
    };
  }, []);

  // Get current word
  const currentWord = wordList[currentIndex] || null;

  // Go to next word with race condition protection
  const goToNext = useCallback(() => {
    if (isTransitioningRef.current || wordList.length === 0) {
      return;
    }

    console.log('[UNIFIED-CONTROLLER] Going to next word');
    isTransitioningRef.current = true;
    lastWordChangeRef.current = Date.now();

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
  }, [wordList.length]);

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

  // Control functions
  const togglePause = useCallback(() => {
    const newPaused = !isPaused;
    console.log(`[UNIFIED-CONTROLLER] Toggling pause: ${newPaused}`);
    
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
  }, [isPaused, currentWord, isMuted, playCurrentWord]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    console.log(`[UNIFIED-CONTROLLER] Toggling mute: ${newMuted}`);
    
    setIsMuted(newMuted);
    unifiedSpeechController.setMuted(newMuted);
    
    // Resume playback if unmuting
    if (!newMuted && !isPaused && currentWord) {
      setTimeout(() => playCurrentWord(), 100);
    }
  }, [isMuted, isPaused, currentWord, playCurrentWord]);

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
    
    // Stop current speech
    unifiedSpeechController.stop();
    
    // Switch to next category
    const nextCategory = vocabularyService.nextSheet();
    console.log(`[UNIFIED-CONTROLLER] Switched to category: ${nextCategory}`);
    
    // Data will be reloaded via the vocabulary change listener
  }, []);

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
