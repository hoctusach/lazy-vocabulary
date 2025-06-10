
import { useCallback } from 'react';
import { directSpeechService } from '@/services/speech/directSpeechService';
import { toast } from 'sonner';

/**
 * Speech control and voice management
 */
export const useSpeechControl = (
  voiceRegion: 'US' | 'UK',
  currentWordRef: React.RefObject<any>,
  pausedRef: React.MutableRefObject<boolean>,
  mutedRef: React.MutableRefObject<boolean>,
  autoPlayTimeoutRef: React.MutableRefObject<number | null>,
  setIsSpeaking: (speaking: boolean) => void,
  goToNext: () => void
) => {
  // Get region-specific timing settings
  const getRegionTiming = useCallback((region: 'US' | 'UK') => {
    return {
      US: {
        wordInterval: 4000,
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
  }, [autoPlayTimeoutRef]);

  // Enhanced play current word with region-specific settings
  const playCurrentWord = useCallback(async () => {
    console.log('[SPEECH-CONTROL] playCurrentWord called');
    
    if (!currentWordRef.current) {
      console.log('[SPEECH-CONTROL] No current word to play');
      return;
    }

    if (pausedRef.current || mutedRef.current) {
      console.log('[SPEECH-CONTROL] Skipping play - paused or muted');
      return;
    }

    const word = currentWordRef.current;
    const timing = getRegionTiming(voiceRegion);
    
    console.log(`[SPEECH-CONTROL] Playing word: ${word.word} with ${voiceRegion} voice settings`);

    setIsSpeaking(true);

    try {
      const success = await directSpeechService.speak(word.word, {
        voiceRegion,
        word: word.word,
        meaning: word.meaning,
        example: word.example,
        onStart: () => {
          console.log(`[SPEECH-CONTROL] Speech started for: ${word.word} (${voiceRegion})`);
        },
        onEnd: () => {
          console.log(`[SPEECH-CONTROL] Speech ended for: ${word.word} (${voiceRegion})`);
          setIsSpeaking(false);
          
          // Auto-advance with region-specific timing if not paused or muted
          if (!pausedRef.current && !mutedRef.current) {
            console.log(`[SPEECH-CONTROL] Scheduling next word in ${timing.wordInterval}ms`);
            autoPlayTimeoutRef.current = window.setTimeout(() => {
              goToNext();
            }, timing.wordInterval);
          }
        },
        onError: (error) => {
          console.error(`[SPEECH-CONTROL] Speech error for ${voiceRegion}:`, error);
          setIsSpeaking(false);
          
          // Still advance on error with region-specific timing
          if (!pausedRef.current && !mutedRef.current) {
            console.log(`[SPEECH-CONTROL] Retrying in ${timing.errorRetryDelay}ms after error`);
            autoPlayTimeoutRef.current = window.setTimeout(() => {
              goToNext();
            }, timing.errorRetryDelay);
          }
        }
      });

      if (!success) {
        console.warn(`[SPEECH-CONTROL] Speech failed to start for ${voiceRegion}`);
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('[SPEECH-CONTROL] Error in playCurrentWord:', error);
      setIsSpeaking(false);
    }
  }, [voiceRegion, getRegionTiming, currentWordRef, pausedRef, mutedRef, autoPlayTimeoutRef, setIsSpeaking, goToNext]);

  return {
    playCurrentWord,
    clearAutoPlay,
    getRegionTiming
  };
};
