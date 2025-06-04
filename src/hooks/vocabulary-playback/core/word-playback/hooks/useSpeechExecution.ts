
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { simpleSpeechController } from '@/utils/speech/simpleSpeechController';

/**
 * Simplified speech execution hook with basic error handling
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
    console.log('[SPEECH-EXECUTION] Starting speech for:', currentWord.word);
    
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

    // Use simplified speech controller
    const success = await simpleSpeechController.speak(speechableText, {
      voice,
      rate: 0.8,
      pitch: 1.0,
      volume: 1.0,
      onStart: () => {
        console.log(`[SPEECH-EXECUTION] Speech started for: ${currentWord.word}`);
        speakingRef.current = true;
        setIsSpeaking(true);
      },
      onEnd: () => {
        console.log(`[SPEECH-EXECUTION] Speech ended for: ${currentWord.word}`);
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
        }
      },
      onError: (event) => {
        console.error(`[SPEECH-EXECUTION] Speech error for "${currentWord.word}":`, event);
        
        speakingRef.current = false;
        setIsSpeaking(false);
        setPlayInProgress(false);
        
        // Handle different error types
        const errorType = event.error as string;
        
        switch (errorType) {
          case 'not-allowed':
            setHasSpeechPermission(false);
            handlePermissionError('not-allowed');
            break;
          case 'network':
            handlePermissionError('network');
            break;
          case 'interrupted':
            console.log('[SPEECH-EXECUTION] Speech was interrupted, advancing without retry');
            setTimeout(() => goToNextWord(), 1000);
            return;
          default:
            console.log('[SPEECH-EXECUTION] Handling generic speech error');
        }
        
        // Simple retry logic
        if (errorType !== 'interrupted' && incrementRetryAttempts()) {
          console.log('[SPEECH-EXECUTION] Retrying after error');
          setTimeout(() => {
            if (!paused && !muted && !wordTransitionRef.current) {
              setPlayInProgress(false);
            }
          }, 1000);
        } else if (errorType !== 'interrupted') {
          console.log('[SPEECH-EXECUTION] Max retries reached, advancing');
          setTimeout(() => goToNextWord(), 1500);
        }
      }
    });

    if (!success) {
      console.warn('[SPEECH-EXECUTION] Speech failed to start');
      setPlayInProgress(false);
      if (!paused && !muted) {
        setTimeout(() => goToNextWord(), 3000);
      }
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
