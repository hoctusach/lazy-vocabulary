
import * as React from 'react';
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '../../useVoiceSelection';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

/**
 * Silent speech execution hook
 */
export const useSpeechExecution = (
  selectedVoice: VoiceSelection,
  findVoice: (region: 'US' | 'UK' | 'AU') => SpeechSynthesisVoice | null,
  setIsSpeaking: (isSpeaking: boolean) => void,
  isPlayingRef: React.MutableRefObject<boolean>,
  advanceToNext: () => void,
  muted: boolean,
  paused: boolean
) => {
  const executeSpeech = useCallback(async (
    wordToPlay: VocabularyWord,
    speechText: string
  ): Promise<boolean> => {
    // Validate pre-conditions
    if (muted) {
      isPlayingRef.current = false;
      return false;
    }
    
    if (paused) {
      isPlayingRef.current = false;
      return false;
    }
    
    try {
      const success = await unifiedSpeechController.speak(wordToPlay, selectedVoice.region);
      
      if (success) {
        setIsSpeaking(true);
        
        // Schedule completion callback with dynamic duration
        const estimatedDuration = Math.max(2000, speechText.length * 40);
        setTimeout(() => {
          setIsSpeaking(false);
          isPlayingRef.current = false;
          
          // Auto-advance with validation
          if (!paused && !muted) {
            setTimeout(() => {
              // Double-check state before advancing
              if (!paused && !muted) {
                advanceToNext();
              }
            }, 1000);
          }
        }, estimatedDuration);
      } else {
        setIsSpeaking(false);
        isPlayingRef.current = false;
        
        // Auto-advance on failure
        if (!paused && !muted) {
          setTimeout(() => advanceToNext(), 2000);
        }
      }

      return success;
      
    } catch (error) {
      setIsSpeaking(false);
      isPlayingRef.current = false;
      
      // Always try to advance on exception to prevent getting stuck
      if (!paused && !muted) {
        setTimeout(() => advanceToNext(), 2000);
      }
      
      return false;
    }
  }, [selectedVoice, setIsSpeaking, isPlayingRef, advanceToNext, muted, paused]);

  return {
    executeSpeech
  };
};
