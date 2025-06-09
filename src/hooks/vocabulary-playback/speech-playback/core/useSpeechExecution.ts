
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '../../useVoiceSelection';
import { simpleSpeechController } from '@/utils/speech/simpleSpeechController';

/**
 * Enhanced speech execution hook with robust error handling and retry logic
 */
export const useSpeechExecution = (
  selectedVoice: VoiceSelection,
  findVoice: (region: 'US' | 'UK') => SpeechSynthesisVoice | null,
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
    console.log(`[SPEECH-EXECUTION-${executionId}] Speech text length: ${speechText.length}`);
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
      // Find the appropriate voice
      const voice = findVoice(selectedVoice.region);
      console.log(`[SPEECH-EXECUTION-${executionId}] Selected voice:`, voice?.name || 'system default');
      
      // Validate text content
      if (!speechText || speechText.trim().length === 0) {
        console.warn(`[SPEECH-EXECUTION-${executionId}] No valid text to speak`);
        isPlayingRef.current = false;
        if (!paused && !muted) {
          setTimeout(() => advanceToNext(), 1000);
        }
        return false;
      }
      
      // Attempt speech with enhanced monitoring
      console.log(`[SPEECH-EXECUTION-${executionId}] Initiating speech synthesis`);
      
      const success = await simpleSpeechController.speak(speechText, {
        voice,
        rate: 0.8,
        pitch: 1.0,
        volume: 1.0,
        onStart: () => {
          console.log(`[SPEECH-EXECUTION-${executionId}] ✓ Speech started successfully for: "${wordToPlay.word}"`);
          setIsSpeaking(true);
        },
        onEnd: () => {
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
            }, 1500);
          } else {
            console.log(`[SPEECH-EXECUTION-${executionId}] Not auto-advancing - paused: ${paused}, muted: ${muted}`);
          }
        },
        onError: (event) => {
          console.error(`[SPEECH-EXECUTION-${executionId}] ✗ Speech error:`, {
            error: event.error,
            type: event.type,
            word: wordToPlay.word,
            textLength: speechText.length
          });
          
          setIsSpeaking(false);
          isPlayingRef.current = false;
          
          // Handle different error types with specific recovery strategies
          switch (event.error) {
            case 'canceled':
              console.log(`[SPEECH-EXECUTION-${executionId}] Speech was canceled - normal operation`);
              // Don't auto-advance for cancellation
              break;
              
            case 'interrupted':
              console.log(`[SPEECH-EXECUTION-${executionId}] Speech was interrupted - advancing`);
              if (!paused && !muted) {
                setTimeout(() => advanceToNext(), 1000);
              }
              break;
              
            case 'network':
              console.log(`[SPEECH-EXECUTION-${executionId}] Network error - advancing after delay`);
              if (!paused && !muted) {
                setTimeout(() => advanceToNext(), 2000);
              }
              break;
              
            case 'not-allowed':
              console.log(`[SPEECH-EXECUTION-${executionId}] Permission error - advancing after delay`);
              if (!paused && !muted) {
                setTimeout(() => advanceToNext(), 2000);
              }
              break;
              
            default:
              console.log(`[SPEECH-EXECUTION-${executionId}] Generic error (${event.error}) - advancing after delay`);
              if (!paused && !muted) {
                setTimeout(() => advanceToNext(), 2000);
              }
          }
        }
      });
      
      console.log(`[SPEECH-EXECUTION-${executionId}] Speech initiation result:`, success);
      
      if (!success) {
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
  }, [selectedVoice, findVoice, setIsSpeaking, isPlayingRef, advanceToNext, muted, paused]);

  return {
    executeSpeech
  };
};
