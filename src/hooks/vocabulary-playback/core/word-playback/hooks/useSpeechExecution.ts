
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { speechController } from '@/utils/speech/core/speechController';
import { useSpeechPermissionManager } from './useSpeechPermissionManager';

/**
 * Hook for executing speech with proper error handling and state management
 * Enhanced with better permission handling and debugging
 */
export const useSpeechExecution = (
  findVoice: (region: 'US' | 'UK') => SpeechSynthesisVoice | null,
  selectedVoice: VoiceSelection,
  setIsSpeaking: (isSpeaking: boolean) => void,
  speakingRef: React.MutableRefObject<boolean>,
  resetRetryAttempts: () => void,
  incrementRetryAttempts: () => boolean,
  goToNextWord: () => void,
  paused: boolean,
  muted: boolean,
  wordTransitionRef: React.MutableRefObject<boolean>,
  permissionErrorShownRef: React.MutableRefObject<boolean>,
  setHasSpeechPermission: (hasPermission: boolean) => void
) => {
  const { handlePermissionError, checkSpeechPermissions } = useSpeechPermissionManager();

  const executeSpeech = useCallback(async (
    currentWord: VocabularyWord,
    speechableText: string,
    setPlayInProgress: (inProgress: boolean) => void
  ) => {
    console.log('[SPEECH-EXECUTION] Starting speech execution for:', currentWord.word);
    console.log('[SPEECH-EXECUTION] Speechable text preview:', speechableText.substring(0, 100) + '...');
    
    // Check permissions first
    const hasPermission = await checkSpeechPermissions();
    if (!hasPermission) {
      console.log('[SPEECH-EXECUTION] Permission check failed');
      setPlayInProgress(false);
      handlePermissionError('not-allowed');
      return false;
    }

    // Find appropriate voice
    const voice = findVoice(selectedVoice.region);
    console.log('[SPEECH-EXECUTION] Selected voice:', voice?.name || 'default');

    // Enhanced speech controller usage with better error handling
    const success = await speechController.speak(speechableText, {
      voice,
      rate: 0.8,
      pitch: 1.0,
      volume: 1.0,
      onStart: () => {
        console.log(`[SPEECH-EXECUTION] Speech started successfully for: ${currentWord.word}`);
        speakingRef.current = true;
        setIsSpeaking(true);
      },
      onEnd: () => {
        console.log(`[SPEECH-EXECUTION] Speech ended successfully for: ${currentWord.word}`);
        speakingRef.current = false;
        setIsSpeaking(false);
        setPlayInProgress(false);
        resetRetryAttempts();
        
        // Auto-advance if not paused or muted
        if (!paused && !muted) {
          console.log('[SPEECH-EXECUTION] Auto-advancing to next word');
          setTimeout(() => {
            goToNextWord();
          }, 1500);
        } else {
          console.log('[SPEECH-EXECUTION] Not auto-advancing due to pause/mute state');
        }
      },
      onError: (event) => {
        console.error(`[SPEECH-EXECUTION] Speech error for "${currentWord.word}":`, {
          error: event.error,
          elapsed: event.elapsedTime
        });
        
        speakingRef.current = false;
        setIsSpeaking(false);
        setPlayInProgress(false);
        
        // Handle different error types
        switch (event.error) {
          case 'not-allowed':
            setHasSpeechPermission(false);
            handlePermissionError('not-allowed');
            break;
          case 'network':
            handlePermissionError('network');
            break;
          case 'canceled':
            console.log('[SPEECH-EXECUTION] Speech was canceled, advancing without retry');
            setTimeout(() => goToNextWord(), 1000);
            return;
          default:
            console.log('[SPEECH-EXECUTION] Handling generic speech error');
        }
        
        // Handle retry logic for retryable errors
        if (event.error !== 'canceled' && incrementRetryAttempts()) {
          console.log('[SPEECH-EXECUTION] Retrying after error');
          setTimeout(() => {
            if (!paused && !muted && !wordTransitionRef.current) {
              setPlayInProgress(false); // Reset flag to allow retry
              // The main hook should handle the retry
            }
          }, 1000);
        } else if (event.error !== 'canceled') {
          console.log('[SPEECH-EXECUTION] Max retries reached or non-retryable error, advancing');
          setTimeout(() => goToNextWord(), 1500);
        }
      }
    });

    if (!success) {
      console.warn('[SPEECH-EXECUTION] Speech failed to start');
      setPlayInProgress(false);
      // Still auto-advance to prevent getting stuck
      if (!paused && !muted) {
        setTimeout(() => goToNextWord(), 3000);
      }
    } else {
      console.log('[SPEECH-EXECUTION] Speech started successfully');
    }

    return success;
  }, [
    findVoice,
    selectedVoice,
    setIsSpeaking,
    speakingRef,
    resetRetryAttempts,
    incrementRetryAttempts,
    goToNextWord,
    paused,
    muted,
    wordTransitionRef,
    setHasSpeechPermission,
    handlePermissionError,
    checkSpeechPermissions
  ]);

  return {
    executeSpeech
  };
};
