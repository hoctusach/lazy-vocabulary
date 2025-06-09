
import { useState, useEffect, useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { enhancedSpeechService } from '@/services/speech/enhancedSpeechService';
import { getVoiceRegionFromStorage } from '@/utils/speech/core/enhancedSpeechSettings';

/**
 * Enhanced vocabulary controller with improved speech synthesis
 */
export const useEnhancedVocabularyController = (words: VocabularyWord[]) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentWord = words[currentIndex] || null;
  const wordCount = words.length;

  console.log('[ENHANCED-CONTROLLER] Controller state:', {
    currentIndex,
    wordCount,
    currentWord: currentWord?.word,
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking
  });

  // Initialize voice region from storage
  useEffect(() => {
    const storedRegion = getVoiceRegionFromStorage();
    setVoiceRegion(storedRegion);
    console.log('[ENHANCED-CONTROLLER] Initialized voice region:', storedRegion);
  }, []);

  // Auto-play logic with enhanced speech
  useEffect(() => {
    if (!currentWord || isPaused || isMuted || isSpeaking) {
      return;
    }

    console.log('[ENHANCED-CONTROLLER] Setting up auto-play for:', currentWord.word);

    const playWord = async () => {
      try {
        setIsSpeaking(true);
        
        const success = await enhancedSpeechService.speakWord(currentWord, {
          voiceRegion,
          onStart: () => {
            console.log('[ENHANCED-CONTROLLER] ✓ Enhanced speech started for:', currentWord.word);
            setIsSpeaking(true);
          },
          onEnd: () => {
            console.log('[ENHANCED-CONTROLLER] ✓ Enhanced speech ended for:', currentWord.word);
            setIsSpeaking(false);
            
            // Auto-advance to next word after enhanced speech completes
            if (!isPaused && !isMuted) {
              autoPlayTimeoutRef.current = setTimeout(() => {
                goToNext();
              }, 1000); // Brief pause before next word
            }
          },
          onError: (error) => {
            console.error('[ENHANCED-CONTROLLER] ✗ Enhanced speech error:', error);
            setIsSpeaking(false);
            
            // Still advance on error to prevent getting stuck
            if (!isPaused && !isMuted) {
              autoPlayTimeoutRef.current = setTimeout(() => {
                goToNext();
              }, 2000);
            }
          }
        });

        if (!success) {
          console.warn('[ENHANCED-CONTROLLER] Enhanced speech failed to start');
          setIsSpeaking(false);
        }

      } catch (error) {
        console.error('[ENHANCED-CONTROLLER] Exception in enhanced playback:', error);
        setIsSpeaking(false);
      }
    };

    // Start enhanced playback with a small delay
    const playTimeout = setTimeout(playWord, 500);

    return () => {
      clearTimeout(playTimeout);
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
        autoPlayTimeoutRef.current = null;
      }
    };
  }, [currentWord, isPaused, isMuted, voiceRegion, currentIndex]);

  // Navigation functions
  const goToNext = useCallback(() => {
    if (words.length === 0) return;
    
    console.log('[ENHANCED-CONTROLLER] Going to next word');
    enhancedSpeechService.stop();
    setIsSpeaking(false);
    
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
    
    setCurrentIndex((prev) => (prev + 1) % words.length);
  }, [words.length]);

  const goToPrevious = useCallback(() => {
    if (words.length === 0) return;
    
    console.log('[ENHANCED-CONTROLLER] Going to previous word');
    enhancedSpeechService.stop();
    setIsSpeaking(false);
    
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
    
    setCurrentIndex((prev) => (prev - 1 + words.length) % words.length);
  }, [words.length]);

  // Control functions
  const togglePause = useCallback(() => {
    console.log('[ENHANCED-CONTROLLER] Toggling pause from:', isPaused);
    
    if (isSpeaking) {
      enhancedSpeechService.stop();
      setIsSpeaking(false);
    }
    
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
    
    setIsPaused(!isPaused);
  }, [isPaused, isSpeaking]);

  const toggleMute = useCallback(() => {
    console.log('[ENHANCED-CONTROLLER] Toggling mute from:', isMuted);
    
    if (isSpeaking) {
      enhancedSpeechService.stop();
      setIsSpeaking(false);
    }
    
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
    
    setIsMuted(!isMuted);
  }, [isMuted, isSpeaking]);

  const toggleVoice = useCallback(() => {
    const newRegion = voiceRegion === 'US' ? 'UK' : 'US';
    console.log('[ENHANCED-CONTROLLER] Switching voice region from', voiceRegion, 'to', newRegion);
    
    // Stop current speech
    if (isSpeaking) {
      enhancedSpeechService.stop();
      setIsSpeaking(false);
    }
    
    setVoiceRegion(newRegion);
    
    // Update localStorage
    try {
      const storedStates = localStorage.getItem('buttonStates');
      const parsedStates = storedStates ? JSON.parse(storedStates) : {};
      parsedStates.voiceRegion = newRegion;
      localStorage.setItem('buttonStates', JSON.stringify(parsedStates));
    } catch (error) {
      console.error('[ENHANCED-CONTROLLER] Error saving voice region:', error);
    }
  }, [voiceRegion, isSpeaking]);

  const playCurrentWord = useCallback(async () => {
    if (!currentWord || isMuted) return;
    
    console.log('[ENHANCED-CONTROLLER] Manual play requested for:', currentWord.word);
    
    enhancedSpeechService.stop();
    setIsSpeaking(false);
    
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
    
    // Small delay before starting
    setTimeout(async () => {
      try {
        setIsSpeaking(true);
        
        await enhancedSpeechService.speakWord(currentWord, {
          voiceRegion,
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false)
        });
      } catch (error) {
        console.error('[ENHANCED-CONTROLLER] Error in manual play:', error);
        setIsSpeaking(false);
      }
    }, 100);
  }, [currentWord, isMuted, voiceRegion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      enhancedSpeechService.stop();
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    };
  }, []);

  return {
    currentWord,
    currentIndex,
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking,
    wordCount,
    goToNext,
    goToPrevious,
    togglePause,
    toggleMute,
    toggleVoice,
    playCurrentWord
  };
};
