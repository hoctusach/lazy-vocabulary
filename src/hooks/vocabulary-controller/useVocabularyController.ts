
import { useState, useCallback, useRef, useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { enhancedSpeechController } from '@/utils/speech/core/speechController';
import { getTimingSettings, getVoiceRegionFromStorage } from '@/utils/speech/core/speechSettings';
import { formatTextForSpeech } from '@/utils/speech/core/textProcessor';
import { toast } from 'sonner';

/**
 * Enhanced vocabulary controller with improved speech timing and regional optimization
 */
export const useVocabularyController = (wordList: VocabularyWord[]) => {
  // Core state - single source of truth
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>(() => getVoiceRegionFromStorage());
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Refs for immediate state tracking
  const pausedRef = useRef(false);
  const mutedRef = useRef(false);
  const currentWordRef = useRef<VocabularyWord | null>(null);
  const autoPlayTimeoutRef = useRef<number | null>(null);

  console.log('[VOCAB-CONTROLLER] === Enhanced State Debug ===');
  console.log('[VOCAB-CONTROLLER] Current state:', {
    currentIndex,
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking,
    wordListLength: wordList.length,
    currentWord: wordList[currentIndex]?.word
  });

  // Update current word reference
  const currentWord = wordList[currentIndex] || null;
  currentWordRef.current = currentWord;

  // Clear any pending auto-play
  const clearAutoPlay = useCallback(() => {
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
  }, []);

  // Enhanced play current word with better timing
  const playCurrentWord = useCallback(async () => {
    console.log('[VOCAB-CONTROLLER] playCurrentWord called with enhanced timing');
    
    if (!currentWordRef.current) {
      console.log('[VOCAB-CONTROLLER] No current word to play');
      return;
    }

    if (pausedRef.current || mutedRef.current) {
      console.log('[VOCAB-CONTROLLER] Skipping play - paused or muted');
      return;
    }

    const word = currentWordRef.current;
    const timing = getTimingSettings(voiceRegion);
    
    console.log(`[VOCAB-CONTROLLER] Playing word: ${word.word} with ${voiceRegion} timing:`, timing);

    setIsSpeaking(true);

    try {
      // Format text for optimal speech delivery
      const speechText = formatTextForSpeech(
        word.word, 
        word.meaning || '', 
        word.example || '', 
        voiceRegion
      );

      console.log(`[VOCAB-CONTROLLER] Formatted speech text:`, speechText);

      const success = await enhancedSpeechController.speak(speechText, {
        region: voiceRegion,
        onStart: () => {
          console.log(`[VOCAB-CONTROLLER] Enhanced speech started for: ${word.word} (${voiceRegion})`);
          setIsSpeaking(true);
        },
        onEnd: () => {
          console.log(`[VOCAB-CONTROLLER] Enhanced speech ended for: ${word.word} (${voiceRegion})`);
          setIsSpeaking(false);
          
          // Auto-advance with enhanced timing if not paused or muted
          if (!pausedRef.current && !mutedRef.current) {
            console.log(`[VOCAB-CONTROLLER] Scheduling next word in ${timing.wordInterval}ms`);
            autoPlayTimeoutRef.current = window.setTimeout(() => {
              if (!pausedRef.current && !mutedRef.current) {
                goToNext();
              }
            }, timing.wordInterval);
          }
        },
        onError: (error) => {
          console.error(`[VOCAB-CONTROLLER] Enhanced speech error for ${voiceRegion}:`, error);
          setIsSpeaking(false);
          
          // Still advance on error with timing
          if (!pausedRef.current && !mutedRef.current) {
            console.log(`[VOCAB-CONTROLLER] Retrying in ${timing.errorRetryDelay}ms after error`);
            autoPlayTimeoutRef.current = window.setTimeout(() => {
              if (!pausedRef.current && !mutedRef.current) {
                goToNext();
              }
            }, timing.errorRetryDelay);
          }
        }
      });

      if (!success) {
        console.warn(`[VOCAB-CONTROLLER] Enhanced speech failed to start for ${voiceRegion}`);
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('[VOCAB-CONTROLLER] Error in enhanced playCurrentWord:', error);
      setIsSpeaking(false);
    }
  }, [voiceRegion]);

  // Navigation controls with enhanced state management
  const goToNext = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] goToNext called');
    
    if (wordList.length === 0) return;
    
    clearAutoPlay();
    enhancedSpeechController.stop();
    setIsSpeaking(false);
    
    setCurrentIndex(prevIndex => {
      const nextIndex = (prevIndex + 1) % wordList.length;
      console.log(`[VOCAB-CONTROLLER] Moving to index ${nextIndex}`);
      return nextIndex;
    });
  }, [wordList.length, clearAutoPlay]);

  const goToPrevious = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] goToPrevious called');
    
    if (wordList.length === 0) return;
    
    clearAutoPlay();
    enhancedSpeechController.stop();
    setIsSpeaking(false);
    
    setCurrentIndex(prevIndex => {
      const prevIndexCalc = prevIndex === 0 ? wordList.length - 1 : prevIndex - 1;
      console.log(`[VOCAB-CONTROLLER] Moving to index ${prevIndexCalc}`);
      return prevIndexCalc;
    });
  }, [wordList.length, clearAutoPlay]);

  // Enhanced control functions with better timing
  const togglePause = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] togglePause called');
    
    const newPaused = !isPaused;
    const timing = getTimingSettings(voiceRegion);
    
    // Update state immediately
    setIsPaused(newPaused);
    pausedRef.current = newPaused;
    
    if (newPaused) {
      // Immediate pause
      console.log('[VOCAB-CONTROLLER] ✓ PAUSING - stopping enhanced speech immediately');
      clearAutoPlay();
      enhancedSpeechController.stop();
      setIsSpeaking(false);
      toast.info("Playback paused");
    } else {
      // Resume with enhanced timing
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
  }, [isPaused, clearAutoPlay, playCurrentWord, voiceRegion]);

  const toggleMute = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] toggleMute called');
    
    const newMuted = !isMuted;
    const timing = getTimingSettings(voiceRegion);
    
    // Update state immediately
    setIsMuted(newMuted);
    mutedRef.current = newMuted;
    
    if (newMuted) {
      // Immediate mute
      console.log('[VOCAB-CONTROLLER] ✓ MUTING - stopping enhanced speech immediately');
      clearAutoPlay();
      enhancedSpeechController.stop();
      setIsSpeaking(false);
      toast.info("Audio muted");
    } else {
      // Unmute with enhanced timing
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
  }, [isMuted, clearAutoPlay, playCurrentWord, voiceRegion]);

  const toggleVoice = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] toggleVoice called');
    
    const newRegion = voiceRegion === 'US' ? 'UK' : 'US';
    const newTiming = getTimingSettings(newRegion);
    
    setVoiceRegion(newRegion);
    
    // Save to localStorage
    try {
      const storedStates = localStorage.getItem('buttonStates');
      const states = storedStates ? JSON.parse(storedStates) : {};
      states.voiceRegion = newRegion;
      localStorage.setItem('buttonStates', JSON.stringify(states));
    } catch (error) {
      console.error('Error saving voice region to localStorage:', error);
    }
    
    // Stop current speech and restart with new voice and timing
    enhancedSpeechController.stop();
    setIsSpeaking(false);
    
    if (!pausedRef.current && !mutedRef.current && currentWordRef.current) {
      setTimeout(() => {
        playCurrentWord();
      }, newTiming.resumeDelay);
    }
    
    toast.success(`Voice changed to ${newRegion} with optimized timing`);
  }, [voiceRegion, playCurrentWord]);

  // Enhanced auto-play effect with better timing
  useEffect(() => {
    console.log('[VOCAB-CONTROLLER] Word changed effect with enhanced timing');
    
    if (!currentWord) return;
    
    const timing = getTimingSettings(voiceRegion);
    
    // Clear any pending speech
    clearAutoPlay();
    enhancedSpeechController.stop();
    setIsSpeaking(false);
    
    // Auto-play with enhanced timing if not paused or muted
    if (!pausedRef.current && !mutedRef.current) {
      const playDelay = setTimeout(() => {
        if (!pausedRef.current && !mutedRef.current) {
          playCurrentWord();
        }
      }, timing.resumeDelay);
      
      return () => clearTimeout(playDelay);
    }
  }, [currentWord, playCurrentWord, clearAutoPlay, voiceRegion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAutoPlay();
      enhancedSpeechController.stop();
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
