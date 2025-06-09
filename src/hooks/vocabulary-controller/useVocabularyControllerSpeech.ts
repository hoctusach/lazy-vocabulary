
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { directSpeechService } from '@/services/speech/directSpeechService';

/**
 * Handles speech functionality for the vocabulary controller
 */
export const useVocabularyControllerSpeech = (
  currentWordRef: React.MutableRefObject<VocabularyWord | null>,
  pausedRef: React.MutableRefObject<boolean>,
  mutedRef: React.MutableRefObject<boolean>,
  voiceRegion: 'US' | 'UK',
  setIsSpeaking: (speaking: boolean) => void,
  autoPlayTimeoutRef: React.MutableRefObject<number | null>,
  goToNext: () => void,
  getRegionTiming: (region: 'US' | 'UK') => { wordInterval: number; errorRetryDelay: number; resumeDelay: number }
) => {
  // Enhanced play current word with region-specific settings
  const playCurrentWord = useCallback(async () => {
    console.log('[VOCAB-CONTROLLER-SPEECH] playCurrentWord called');
    
    if (!currentWordRef.current) {
      console.log('[VOCAB-CONTROLLER-SPEECH] No current word to play');
      return;
    }

    if (pausedRef.current || mutedRef.current) {
      console.log('[VOCAB-CONTROLLER-SPEECH] Skipping play - paused or muted');
      return;
    }

    const word = currentWordRef.current;
    const timing = getRegionTiming(voiceRegion);
    
    console.log(`[VOCAB-CONTROLLER-SPEECH] Playing word: ${word.word} with ${voiceRegion} voice settings`);

    setIsSpeaking(true);

    try {
      const success = await directSpeechService.speak(word.word, {
        voiceRegion,
        word: word.word,
        meaning: word.meaning,
        example: word.example,
        onStart: () => {
          console.log(`[VOCAB-CONTROLLER-SPEECH] Speech started for: ${word.word} (${voiceRegion})`);
        },
        onEnd: () => {
          console.log(`[VOCAB-CONTROLLER-SPEECH] Speech ended for: ${word.word} (${voiceRegion})`);
          setIsSpeaking(false);
          
          // Auto-advance with region-specific timing if not paused or muted
          if (!pausedRef.current && !mutedRef.current) {
            console.log(`[VOCAB-CONTROLLER-SPEECH] Scheduling next word in ${timing.wordInterval}ms`);
            autoPlayTimeoutRef.current = window.setTimeout(() => {
              goToNext();
            }, timing.wordInterval);
          }
        },
        onError: (error) => {
          console.error(`[VOCAB-CONTROLLER-SPEECH] Speech error for ${voiceRegion}:`, error);
          setIsSpeaking(false);
          
          // Still advance on error with region-specific timing
          if (!pausedRef.current && !mutedRef.current) {
            console.log(`[VOCAB-CONTROLLER-SPEECH] Retrying in ${timing.errorRetryDelay}ms after error`);
            autoPlayTimeoutRef.current = window.setTimeout(() => {
              goToNext();
            }, timing.errorRetryDelay);
          }
        }
      });

      if (!success) {
        console.warn(`[VOCAB-CONTROLLER-SPEECH] Speech failed to start for ${voiceRegion}`);
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('[VOCAB-CONTROLLER-SPEECH] Error in playCurrentWord:', error);
      setIsSpeaking(false);
    }
  }, [currentWordRef, pausedRef, mutedRef, voiceRegion, setIsSpeaking, autoPlayTimeoutRef, goToNext, getRegionTiming]);

  return {
    playCurrentWord
  };
};
