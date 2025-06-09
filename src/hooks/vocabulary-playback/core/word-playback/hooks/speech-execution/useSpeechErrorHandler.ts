
import { useCallback } from 'react';

/**
 * Hook for handling speech synthesis errors with appropriate recovery strategies
 */
export const useSpeechErrorHandler = (
  setHasSpeechPermission: (hasPermission: boolean) => void,
  handlePermissionError: (errorType: string) => void,
  incrementRetryAttempts: () => boolean,
  goToNextWord: () => void,
  paused: boolean,
  muted: boolean,
  wordTransitionRef: React.MutableRefObject<boolean>,
  setPlayInProgress: (inProgress: boolean) => void
) => {
  const handleSpeechError = useCallback((
    sessionId: string,
    event: SpeechSynthesisErrorEvent,
    currentWord: { word: string },
    speakingRef: React.MutableRefObject<boolean>,
    setIsSpeaking: (isSpeaking: boolean) => void
  ) => {
    const errorDetails = {
      error: event.error,
      type: event.type,
      isTrusted: event.isTrusted,
      word: currentWord.word
    };
    
    console.error(`[SPEECH-ERROR-${sessionId}] ✗ Speech error:`, errorDetails);
    
    speakingRef.current = false;
    setIsSpeaking(false);
    setPlayInProgress(false);
    
    // Enhanced error handling based on error type
    switch (event.error) {
      case 'not-allowed':
        console.log(`[SPEECH-ERROR-${sessionId}] Permission denied`);
        setHasSpeechPermission(false);
        handlePermissionError('not-allowed');
        break;
        
      case 'network':
        console.log(`[SPEECH-ERROR-${sessionId}] Network error`);
        handlePermissionError('network');
        if (!paused && !muted) {
          setTimeout(() => goToNextWord(), 2000);
        }
        break;
        
      case 'synthesis-unavailable':
      case 'synthesis-failed':
        console.log(`[SPEECH-ERROR-${sessionId}] Synthesis error - advancing`);
        if (!paused && !muted) {
          setTimeout(() => goToNextWord(), 1000);
        }
        break;
        
      default:
        console.log(`[SPEECH-ERROR-${sessionId}] Generic error handling for: ${event.error}`);
        if (!paused && !muted) {
          setTimeout(() => goToNextWord(), 1500);
        }
    }
    
    // Retry logic for recoverable errors
    const recoverableErrors: SpeechSynthesisErrorCode[] = ['network', 'audio-busy', 'synthesis-failed'];
    if (recoverableErrors.includes(event.error)) {
      if (incrementRetryAttempts()) {
        console.log(`[SPEECH-ERROR-${sessionId}] Retrying after recoverable error`);
        setTimeout(() => {
          if (!paused && !muted && !wordTransitionRef.current) {
            setPlayInProgress(false);
          }
        }, 1000);
      } else {
        console.log(`[SPEECH-ERROR-${sessionId}] Max retries reached, advancing`);
        if (!paused && !muted) {
          setTimeout(() => goToNextWord(), 1500);
        }
      }
    }
  }, [
    setHasSpeechPermission,
    handlePermissionError,
    incrementRetryAttempts,
    goToNextWord,
    paused,
    muted,
    wordTransitionRef,
    setPlayInProgress
  ]);

  return {
    handleSpeechError
  };
};
