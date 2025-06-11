
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { useSpeechController } from './speech-execution/useSpeechController';
import { useSpeechCallbacks } from './speech-execution/useSpeechCallbacks';
import { useSpeechErrorHandler } from './speech-execution/useSpeechErrorHandler';

/**
 * Hook for executing speech synthesis with proper error handling and auto-advance
 */
export const useSpeechExecution = (
  findVoice: (region: 'US' | 'UK' | 'AU') => SpeechSynthesisVoice | null,
  selectedVoice: VoiceSelection,
  setIsSpeaking: (isSpeaking: boolean) => void,
  speakingRef: React.MutableRefObject<boolean>,
  resetRetryAttempts: () => void,
  incrementRetryAttempts: () => boolean,
  paused: boolean,
  muted: boolean,
  wordTransitionRef: React.MutableRefObject<boolean>,
  goToNextWord: (fromUser?: boolean) => void,
  scheduleAutoAdvance: (delay: number) => void
) => {
  const [setPlayInProgress] = useState(false);

  const { executeSpeechSynthesis } = useSpeechController(
    findVoice,
    selectedVoice,
    scheduleAutoAdvance
  );

  const { createOnStartCallback, createOnEndCallback } = useSpeechCallbacks(
    speakingRef,
    setIsSpeaking,
    resetRetryAttempts,
    setPlayInProgress,
    paused,
    muted,
    wordTransitionRef,
    goToNextWord,
    scheduleAutoAdvance
  );

  const { handleSpeechError } = useSpeechErrorHandler(
    incrementRetryAttempts,
    goToNextWord,
    scheduleAutoAdvance,
    paused,
    muted,
    wordTransitionRef,
    setPlayInProgress
  );

  const executeSpeech = useCallback(async (
    currentWord: VocabularyWord,
    speechText: string
  ): Promise<boolean> => {
    const sessionId = Math.random().toString(36).substring(7);
    console.log(`[SPEECH-EXECUTION-${sessionId}] Starting execution for: "${currentWord.word}"`);

    // Create callbacks
    const onStart = createOnStartCallback(sessionId);
    const onEnd = createOnEndCallback(sessionId);
    const onError = (event: SpeechSynthesisErrorEvent) => {
      handleSpeechError(sessionId, event, currentWord, speakingRef, setIsSpeaking);
    };

    try {
      const success = await executeSpeechSynthesis(
        sessionId,
        currentWord,
        speechText,
        onStart,
        onEnd,
        onError,
        setPlayInProgress,
        paused,
        muted
      );

      return success;
    } catch (error) {
      console.error(`[SPEECH-EXECUTION-${sessionId}] Exception:`, error);
      setIsSpeaking(false);
      setPlayInProgress(false);
      
      if (!paused && !muted) {
        scheduleAutoAdvance(2000);
      }
      
      return false;
    }
  }, [
    selectedVoice,
    findVoice,
    executeSpeechSynthesis,
    createOnStartCallback,
    createOnEndCallback,
    handleSpeechError,
    speakingRef,
    setIsSpeaking,
    paused,
    muted,
    scheduleAutoAdvance
  ]);

  return {
    executeSpeech
  };
};
