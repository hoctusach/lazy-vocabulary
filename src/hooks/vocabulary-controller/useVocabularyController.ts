
import { useState, useCallback, useRef, useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { directSpeechService } from '@/services/speech/directSpeechService';
import { vocabularyService } from '@/services/vocabularyService';
import { toast } from 'sonner';

/**
 * Enhanced vocabulary controller with random word selection and improved speech management
 */
export const useVocabularyController = (wordList: VocabularyWord[]) => {
  // Core state - single source of truth
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Refs for immediate state tracking
  const pausedRef = useRef(false);
  const mutedRef = useRef(false);
  const currentWordRef = useRef<VocabularyWord | null>(null);
  const autoPlayTimeoutRef = useRef<number | null>(null);

  console.log('[VOCAB-CONTROLLER] === State Debug ===');
  console.log('[VOCAB-CONTROLLER] Current state:', {
    currentIndex,
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking,
    wordListLength: wordList.length,
    currentWord: wordList[currentIndex]?.word
  });

  // Get current word from vocabulary service instead of wordList[currentIndex]
  // This ensures we get the random word from the service
  const currentWord = vocabularyService.getCurrentWord();
  currentWordRef.current = currentWord;

  console.log('[VOCAB-CONTROLLER] Current word from service:', currentWord?.word);

  // Get region-specific timing settings
  const getRegionTiming = useCallback((region: 'US' | 'UK') => {
    return {
      US: {
        wordInterval: 4000, // Longer interval for US voices
        errorRetryDelay: 3000,
        resumeDelay: 200
      },
      UK: {
        wordInterval: 3000,
        errorRetryDelay: 2500,
        resumeDelay: 150
      }
    }[region];
  }, []);

  // Clear any pending auto-play
  const clearAutoPlay = useCallback(() => {
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
  }, []);

  // Enhanced play current word with region-specific settings
  const playCurrentWord = useCallback(async () => {
    console.log('[VOCAB-CONTROLLER] playCurrentWord called');
    
    if (!currentWordRef.current) {
      console.log('[VOCAB-CONTROLLER] No current word to play');
      return;
    }

    if (pausedRef.current || mutedRef.current) {
      console.log('[VOCAB-CONTROLLER] Skipping play - paused or muted');
      return;
    }

    const word = currentWordRef.current;
    const timing = getRegionTiming(voiceRegion);
    
    console.log(`[VOCAB-CONTROLLER] Playing word: ${word.word} with ${voiceRegion} voice settings`);

    setIsSpeaking(true);

    try {
      const success = await directSpeechService.speak(word.word, {
        voiceRegion,
        word: word.word,
        meaning: word.meaning,
        example: word.example,
        onStart: () => {
          console.log(`[VOCAB-CONTROLLER] Speech started for: ${word.word} (${voiceRegion})`);
        },
        onEnd: () => {
          console.log(`[VOCAB-CONTROLLER] Speech ended for: ${word.word} (${voiceRegion})`);
          setIsSpeaking(false);
          
          // Auto-advance with region-specific timing if not paused or muted
          if (!pausedRef.current && !mutedRef.current) {
            console.log(`[VOCAB-CONTROLLER] Scheduling next word in ${timing.wordInterval}ms`);
            autoPlayTimeoutRef.current = window.setTimeout(() => {
              goToNext();
            }, timing.wordInterval);
          }
        },
        onError: (error) => {
          console.error(`[VOCAB-CONTROLLER] Speech error for ${voiceRegion}:`, error);
          setIsSpeaking(false);
          
          // Still advance on error with region-specific timing
          if (!pausedRef.current && !mutedRef.current) {
            console.log(`[VOCAB-CONTROLLER] Retrying in ${timing.errorRetryDelay}ms after error`);
            autoPlayTimeoutRef.current = window.setTimeout(() => {
              goToNext();
            }, timing.errorRetryDelay);
          }
        }
      });

      if (!success) {
        console.warn(`[VOCAB-CONTROLLER] Speech failed to start for ${voiceRegion}`);
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('[VOCAB-CONTROLLER] Error in playCurrentWord:', error);
      setIsSpeaking(false);
    }
  }, [voiceRegion, getRegionTiming]);

  // Navigation controls - use vocabulary service for random selection
  const goToNext = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] goToNext called');
    
    if (wordList.length === 0) return;
    
    clearAutoPlay();
    directSpeechService.stop();
    setIsSpeaking(false);
    
    // Get next random word from vocabulary service
    const nextWord = vocabularyService.getNextWord();
    if (nextWord) {
      console.log(`[VOCAB-CONTROLLER] Moving to next random word: ${nextWord.word}`);
      // Update the index to trigger re-renders (though we use service for actual word)
      setCurrentIndex(prevIndex => (prevIndex + 1) % wordList.length);
    }
  }, [wordList.length, clearAutoPlay]);

  const goToPrevious = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] goToPrevious called - not supported with random selection');
    // Previous navigation doesn't make sense with random selection
    // Could implement "go back to last word" functionality if needed
    toast.info("Previous word not available with random selection");
  }, []);

  // Enhanced control functions with region-aware timing
  const togglePause = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] togglePause called');
    
    const newPaused = !isPaused;
    const timing = getRegionTiming(voiceRegion);
    
    // Update state immediately
    setIsPaused(newPaused);
    pausedRef.current = newPaused;
    
    if (newPaused) {
      // Immediate pause
      console.log('[VOCAB-CONTROLLER] ✓ PAUSING - stopping speech immediately');
      clearAutoPlay();
      directSpeechService.stop();
      setIsSpeaking(false);
      toast.info("Playback paused");
    } else {
      // Resume with region-specific timing
      console.log(`[VOCAB-CONTROLLER] ✓ RESUMING - will play current word in ${timing.resumeDelay}ms`);
      if (!mutedRef.current && currentWordRef.current) {
        setTimeout(() => {
          if (!pausedRef.current) {
            playCurrentWord();
          }
        }, timing.resumeDelay);
      }
      toast.success("Playback resumed");
    }
  }, [isPaused, clearAutoPlay, playCurrentWord, getRegionTiming, voiceRegion]);

  const toggleMute = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] toggleMute called');
    
    const newMuted = !isMuted;
    const timing = getRegionTiming(voiceRegion);
    
    // Update state immediately
    setIsMuted(newMuted);
    mutedRef.current = newMuted;
    
    if (newMuted) {
      // Immediate mute
      console.log('[VOCAB-CONTROLLER] ✓ MUTING - stopping speech immediately');
      clearAutoPlay();
      directSpeechService.stop();
      setIsSpeaking(false);
      toast.info("Audio muted");
    } else {
      // Unmute with region-specific timing
      console.log(`[VOCAB-CONTROLLER] ✓ UNMUTING - will play current word in ${timing.resumeDelay}ms`);
      if (!pausedRef.current && currentWordRef.current) {
        setTimeout(() => {
          if (!mutedRef.current) {
            playCurrentWord();
          }
        }, timing.resumeDelay);
      }
      toast.success("Audio unmuted");
    }
  }, [isMuted, clearAutoPlay, playCurrentWord, getRegionTiming, voiceRegion]);

  const toggleVoice = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] toggleVoice called');
    
    const newRegion = voiceRegion === 'US' ? 'UK' : 'US';
    const newTiming = getRegionTiming(newRegion);
    
    setVoiceRegion(newRegion);
    
    // Stop current speech and restart with new voice and timing
    directSpeechService.stop();
    setIsSpeaking(false);
    
    if (!pausedRef.current && !mutedRef.current && currentWordRef.current) {
      setTimeout(() => {
        playCurrentWord();
      }, newTiming.resumeDelay);
    }
    
    toast.success(`Voice changed to ${newRegion}`);
  }, [voiceRegion, playCurrentWord, getRegionTiming]);

  // Enhanced auto-play effect with region-specific timing
  useEffect(() => {
    console.log('[VOCAB-CONTROLLER] Word changed effect');
    
    if (!currentWord) return;
    
    const timing = getRegionTiming(voiceRegion);
    
    // Clear any pending speech
    clearAutoPlay();
    directSpeechService.stop();
    setIsSpeaking(false);
    
    // Auto-play with region-specific delay if not paused or muted
    if (!pausedRef.current && !mutedRef.current) {
      const playDelay = setTimeout(() => {
        if (!pausedRef.current && !mutedRef.current) {
          playCurrentWord();
        }
      }, timing.resumeDelay);
      
      return () => clearTimeout(playDelay);
    }
  }, [currentWord, playCurrentWord, clearAutoPlay, getRegionTiming, voiceRegion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAutoPlay();
      directSpeechService.stop();
    };
  }, [clearAutoPlay]);

  return {
    // State
    currentWord,
    currentIndex,
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking,
    
    // Navigation
    goToNext,
    goToPrevious,
    
    // Controls
    togglePause,
    toggleMute,
    toggleVoice,
    playCurrentWord,
    
    // Utils
    wordCount: wordList.length
  };
};
