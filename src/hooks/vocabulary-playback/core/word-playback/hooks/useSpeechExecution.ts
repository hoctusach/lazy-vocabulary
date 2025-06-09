
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { simpleSpeechController } from '@/utils/speech/simpleSpeechController';

/**
 * Enhanced speech execution hook with comprehensive error handling
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
  setHasSpeechPermission: (hasPermission: boolean) => void,
  handlePermissionError: (errorType: string) => void,
  checkSpeechPermissions: () => Promise<boolean>
) => {
  const executeSpeech = useCallback(async (
    currentWord: VocabularyWord,
    speechableText: string,
    setPlayInProgress: (inProgress: boolean) => void
  ) => {
    const sessionId = Math.random().toString(36).substring(7);
    console.log(`[SPEECH-EXECUTION-${sessionId}] === Starting Enhanced Speech Process ===`);
    console.log(`[SPEECH-EXECUTION-${sessionId}] Word: "${currentWord.word}"`);
    console.log(`[SPEECH-EXECUTION-${sessionId}] Text length: ${speechableText.length}`);
    console.log(`[SPEECH-EXECUTION-${sessionId}] State:`, { paused, muted, wordTransition: wordTransitionRef.current });

    // Pre-flight validation
    if (paused || muted) {
      console.log(`[SPEECH-EXECUTION-${sessionId}] Skipping due to state - paused: ${paused}, muted: ${muted}`);
      setPlayInProgress(false);
      return false;
    }

    if (wordTransitionRef.current) {
      console.log(`[SPEECH-EXECUTION-${sessionId}] Skipping due to word transition in progress`);
      setPlayInProgress(false);
      return false;
    }

    try {
      // Check permissions
      console.log(`[SPEECH-EXECUTION-${sessionId}] Checking speech permissions`);
      const hasPermission = await checkSpeechPermissions();
      if (!hasPermission) {
        console.log(`[SPEECH-EXECUTION-${sessionId}] Permission check failed`);
        setPlayInProgress(false);
        handlePermissionError('not-allowed');
        return false;
      }

      // Find and validate voice
      const voice = findVoice(selectedVoice.region);
      console.log(`[SPEECH-EXECUTION-${sessionId}] Voice selection:`, {
        requested: selectedVoice.region,
        found: voice?.name || 'system default',
        lang: voice?.lang || 'unknown'
      });

      // Validate speech content
      if (!speechableText || speechableText.trim().length === 0) {
        console.warn(`[SPEECH-EXECUTION-${sessionId}] No valid content to speak`);
        setPlayInProgress(false);
        setTimeout(() => goToNextWord(), 1500);
        return false;
      }

      console.log(`[SPEECH-EXECUTION-${sessionId}] Initiating speech with enhanced monitoring`);

      // Execute speech with comprehensive error handling
      const success = await simpleSpeechController.speak(speechableText, {
        voice,
        rate: 0.8,
        pitch: 1.0,
        volume: 1.0,
        onStart: () => {
          console.log(`[SPEECH-EXECUTION-${sessionId}] ✓ Speech started successfully`);
          speakingRef.current = true;
          setIsSpeaking(true);
          resetRetryAttempts(); // Reset on successful start
        },
        onEnd: () => {
          console.log(`[SPEECH-EXECUTION-${sessionId}] ✓ Speech completed successfully`);
          speakingRef.current = false;
          setIsSpeaking(false);
          setPlayInProgress(false);
          
          // Auto-advance with state validation
          if (!paused && !muted && !wordTransitionRef.current) {
            console.log(`[SPEECH-EXECUTION-${sessionId}] Auto-advancing to next word`);
            setTimeout(() => {
              // Double-check state before advancing
              if (!paused && !muted && !wordTransitionRef.current) {
                goToNextWord();
              } else {
                console.log(`[SPEECH-EXECUTION-${sessionId}] State changed during delay, not advancing`);
              }
            }, 1500);
          } else {
            console.log(`[SPEECH-EXECUTION-${sessionId}] Not auto-advancing due to state`);
          }
        },
        onError: (event) => {
          const errorDetails = {
            error: event.error,
            type: event.type,
            isTrusted: event.isTrusted,
            word: currentWord.word
          };
          
          console.error(`[SPEECH-EXECUTION-${sessionId}] ✗ Speech error:`, errorDetails);
          
          speakingRef.current = false;
          setIsSpeaking(false);
          setPlayInProgress(false);
          
          // Enhanced error handling based on error type
          switch (event.error) {
            case 'not-allowed':
              console.log(`[SPEECH-EXECUTION-${sessionId}] Permission denied`);
              setHasSpeechPermission(false);
              handlePermissionError('not-allowed');
              break;
              
            case 'network':
              console.log(`[SPEECH-EXECUTION-${sessionId}] Network error`);
              handlePermissionError('network');
              if (!paused && !muted) {
                setTimeout(() => goToNextWord(), 2000);
              }
              break;
              
            case 'canceled':
              console.log(`[SPEECH-EXECUTION-${sessionId}] Speech canceled - normal operation`);
              // Don't advance on cancellation as it's usually intentional
              return;
              
            case 'interrupted':
              console.log(`[SPEECH-EXECUTION-${sessionId}] Speech interrupted - advancing`);
              if (!paused && !muted) {
                setTimeout(() => goToNextWord(), 1000);
              }
              return;
              
            default:
              console.log(`[SPEECH-EXECUTION-${sessionId}] Generic error handling`);
          }
          
          // Retry logic for recoverable errors
          if (event.error !== 'canceled' && event.error !== 'interrupted') {
            if (incrementRetryAttempts()) {
              console.log(`[SPEECH-EXECUTION-${sessionId}] Retrying after error`);
              setTimeout(() => {
                if (!paused && !muted && !wordTransitionRef.current) {
                  setPlayInProgress(false);
                }
              }, 1000);
            } else {
              console.log(`[SPEECH-EXECUTION-${sessionId}] Max retries reached, advancing`);
              if (!paused && !muted) {
                setTimeout(() => goToNextWord(), 1500);
              }
            }
          }
        }
      });

      console.log(`[SPEECH-EXECUTION-${sessionId}] Speech initiation result: ${success}`);

      if (!success) {
        console.warn(`[SPEECH-EXECUTION-${sessionId}] ✗ Speech failed to start`);
        setPlayInProgress(false);
        if (!paused && !muted) {
          setTimeout(() => goToNextWord(), 3000);
        }
      }

      return success;
      
    } catch (error) {
      console.error(`[SPEECH-EXECUTION-${sessionId}] ✗ Exception in speech execution:`, error);
      speakingRef.current = false;
      setIsSpeaking(false);
      setPlayInProgress(false);
      
      // Always advance on exception to prevent getting stuck
      if (!paused && !muted) {
        setTimeout(() => goToNextWord(), 2000);
      }
      
      return false;
    }
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
