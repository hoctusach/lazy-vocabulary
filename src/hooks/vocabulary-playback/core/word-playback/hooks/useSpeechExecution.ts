
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { speechController } from '@/utils/speech/core/speechController';
import { toast } from 'sonner';

/**
 * Hook for executing speech with proper error handling and state management
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
  const executeSpeech = useCallback(async (
    currentWord: VocabularyWord,
    speechableText: string,
    setPlayInProgress: (inProgress: boolean) => void
  ) => {
    // Find appropriate voice
    const voice = findVoice(selectedVoice.region);
    console.log('[SPEECH-EXECUTION] Selected voice:', voice?.name || 'default');

    // Use the improved centralized speech controller
    const success = await speechController.speak(speechableText, {
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
        } else {
          console.log('[SPEECH-EXECUTION] Not auto-advancing due to pause/mute state');
        }
      },
      onError: (event) => {
        console.error(`[SPEECH-EXECUTION] Speech error:`, event);
        
        speakingRef.current = false;
        setIsSpeaking(false);
        setPlayInProgress(false);
        
        // Handle permission errors
        if (event.error === 'not-allowed') {
          setHasSpeechPermission(false);
          if (!permissionErrorShownRef.current) {
            toast.error("Please click anywhere on the page to enable audio playback");
            permissionErrorShownRef.current = true;
          }
        }
        
        // Don't retry on cancel errors to prevent loops
        if (event.error === 'canceled') {
          console.log('[SPEECH-EXECUTION] Speech was canceled, advancing without retry');
          setTimeout(() => goToNextWord(), 1000);
          return;
        }
        
        // Handle retry logic for other errors
        if (incrementRetryAttempts()) {
          console.log('[SPEECH-EXECUTION] Retrying after error');
          setTimeout(() => {
            if (!paused && !muted && !wordTransitionRef.current) {
              setPlayInProgress(false); // Reset flag to allow retry
              // Note: playCurrentWord would need to be called here in the main hook
            }
          }, 1000);
        } else {
          console.log('[SPEECH-EXECUTION] Max retries reached, advancing');
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
    permissionErrorShownRef,
    setHasSpeechPermission
  ]);

  return {
    executeSpeech
  };
};
