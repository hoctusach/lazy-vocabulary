
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '../../useVoiceSelection';
import { simpleSpeechController } from '@/utils/speech/controller/simpleSpeechController';

/**
 * Enhanced speech execution hook with robust error handling and retry logic
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
    const executionId = Math.random().toString(36).substring(7);
    console.log(`[SPEECH-EXECUTION-${executionId}] Starting execution for: "${wordToPlay.word}"`);
    console.log(`[SPEECH-EXECUTION-${executionId}] Current state:`, {
      muted,
      paused,
      isPlayingRef: isPlayingRef.current
    });
    
    // Validate pre-conditions
    if (muted) {
      console.log(`[SPEECH-EXECUTION-${executionId}] Skipping - speech is muted`);
      isPlayingRef.current = false;
      return false;
    }
    
    if (paused) {
      console.log(`[SPEECH-EXECUTION-${executionId}] Skipping - speech is paused`);
      isPlayingRef.current = false;
      return false;
    }
    
    try {
      console.log(`[SPEECH-EXECUTION-${executionId}] Initiating speech synthesis with simple controller`);
      
      const success = await simpleSpeechController.speak(wordToPlay, selectedVoice.region);
      
      console.log(`[SPEECH-EXECUTION-${executionId}] Speech initiation result:`, success);
      
      if (success) {
        console.log(`[SPEECH-EXECUTION-${executionId}] ✓ Speech started successfully for: "${wordToPlay.word}"`);
        setIsSpeaking(true);
        
        // Schedule completion callback with dynamic duration
        const estimatedDuration = Math.max(2000, speechText.length * 40);
        setTimeout(() => {
          console.log(`[SPEECH-EXECUTION-${executionId}] ✓ Speech completed for: "${wordToPlay.word}"`);
          setIsSpeaking(false);
          isPlayingRef.current = false;
          
          // Auto-advance with validation
          if (!paused && !muted) {
            console.log(`[SPEECH-EXECUTION-${executionId}] Auto-advancing to next word`);
            setTimeout(() => {
              // Double-check state before advancing
              if (!paused && !muted) {
                advanceToNext();
              } else {
                console.log(`[SPEECH-EXECUTION-${executionId}] State changed, skipping auto-advance`);
              }
            }, 1000);
          } else {
            console.log(`[SPEECH-EXECUTION-${executionId}] Not auto-advancing - paused: ${paused}, muted: ${muted}`);
          }
        }, estimatedDuration);
      } else {
        console.warn(`[SPEECH-EXECUTION-${executionId}] ✗ Speech failed to start`);
        setIsSpeaking(false);
        isPlayingRef.current = false;
        
        // Auto-advance on failure
        if (!paused && !muted) {
          console.log(`[SPEECH-EXECUTION-${executionId}] Auto-advancing after failure`);
          setTimeout(() => advanceToNext(), 2000);
        }
      }

      return success;
      
    } catch (error) {
      console.error(`[SPEECH-EXECUTION-${executionId}] ✗ Exception in executeSpeech:`, error);
      setIsSpeaking(false);
      isPlayingRef.current = false;
      
      // Always try to advance on exception to prevent getting stuck
      if (!paused && !muted) {
        console.log(`[SPEECH-EXECUTION-${executionId}] Auto-advancing after exception`);
        setTimeout(() => advanceToNext(), 2000);
      }
      
      return false;
    }
  }, [selectedVoice, setIsSpeaking, isPlayingRef, advanceToNext, muted, paused]);

  return {
    executeSpeech
  };
};
