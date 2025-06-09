
import { useState, useCallback, useRef, useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { directSpeechService } from '@/services/speech/directSpeechService';
import { toast } from 'sonner';

/**
 * Unified vocabulary controller with immediate response and single source of truth
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

  // Play current word with immediate state checks
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
    console.log(`[VOCAB-CONTROLLER] Playing word: ${word.word}`);

    setIsSpeaking(true);

    const speechText = `${word.word}. ${word.meaning}. ${word.example}`;
    
    try {
      const success = await directSpeechService.speak(speechText, {
        voiceRegion,
        onStart: () => {
          console.log(`[VOCAB-CONTROLLER] Speech started for: ${word.word}`);
        },
        onEnd: () => {
          console.log(`[VOCAB-CONTROLLER] Speech ended for: ${word.word}`);
          setIsSpeaking(false);
          
          // Auto-advance to next word if not paused or muted
          if (!pausedRef.current && !mutedRef.current) {
            autoPlayTimeoutRef.current = window.setTimeout(() => {
              goToNext();
            }, 1000);
          }
        },
        onError: (error) => {
          console.error('[VOCAB-CONTROLLER] Speech error:', error);
          setIsSpeaking(false);
          
          // Still advance on error if not paused/muted
          if (!pausedRef.current && !mutedRef.current) {
            autoPlayTimeoutRef.current = window.setTimeout(() => {
              goToNext();
            }, 2000);
          }
        }
      });

      if (!success) {
        console.warn('[VOCAB-CONTROLLER] Speech failed to start');
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('[VOCAB-CONTROLLER] Error in playCurrentWord:', error);
      setIsSpeaking(false);
    }
  }, [voiceRegion]);

  // Navigation controls
  const goToNext = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] goToNext called');
    
    if (wordList.length === 0) return;
    
    clearAutoPlay();
    directSpeechService.stop();
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
    directSpeechService.stop();
    setIsSpeaking(false);
    
    setCurrentIndex(prevIndex => {
      const prevIndexCalc = prevIndex === 0 ? wordList.length - 1 : prevIndex - 1;
      console.log(`[VOCAB-CONTROLLER] Moving to index ${prevIndexCalc}`);
      return prevIndexCalc;
    });
  }, [wordList.length, clearAutoPlay]);

  // Control functions with immediate response
  const togglePause = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] togglePause called');
    
    const newPaused = !isPaused;
    
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
      // Resume
      console.log('[VOCAB-CONTROLLER] ✓ RESUMING - will play current word');
      if (!mutedRef.current && currentWordRef.current) {
        // Small delay to ensure state is updated
        setTimeout(() => {
          if (!pausedRef.current) {
            playCurrentWord();
          }
        }, 100);
      }
      toast.success("Playback resumed");
    }
  }, [isPaused, clearAutoPlay, playCurrentWord]);

  const toggleMute = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] toggleMute called');
    
    const newMuted = !isMuted;
    
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
      // Unmute
      console.log('[VOCAB-CONTROLLER] ✓ UNMUTING - will play current word');
      if (!pausedRef.current && currentWordRef.current) {
        setTimeout(() => {
          if (!mutedRef.current) {
            playCurrentWord();
          }
        }, 100);
      }
      toast.success("Audio unmuted");
    }
  }, [isMuted, clearAutoPlay, playCurrentWord]);

  const toggleVoice = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] toggleVoice called');
    
    const newRegion = voiceRegion === 'US' ? 'UK' : 'US';
    setVoiceRegion(newRegion);
    
    // Stop current speech and restart with new voice
    directSpeechService.stop();
    setIsSpeaking(false);
    
    if (!pausedRef.current && !mutedRef.current && currentWordRef.current) {
      setTimeout(() => {
        playCurrentWord();
      }, 200);
    }
    
    toast.success(`Voice changed to ${newRegion}`);
  }, [voiceRegion, playCurrentWord]);

  // Auto-play effect when word changes
  useEffect(() => {
    console.log('[VOCAB-CONTROLLER] Word changed effect');
    
    if (!currentWord) return;
    
    // Clear any pending speech
    clearAutoPlay();
    directSpeechService.stop();
    setIsSpeaking(false);
    
    // Auto-play if not paused or muted
    if (!pausedRef.current && !mutedRef.current) {
      const playDelay = setTimeout(() => {
        if (!pausedRef.current && !mutedRef.current) {
          playCurrentWord();
        }
      }, 500);
      
      return () => clearTimeout(playDelay);
    }
  }, [currentWord, playCurrentWord, clearAutoPlay]);

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
