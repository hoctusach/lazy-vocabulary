
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { useSpeechValidation } from './speech-execution/useSpeechValidation';
import { useSpeechErrorHandler } from './speech-execution/useSpeechErrorHandler';
import { useSpeechCallbacks } from './speech-execution/useSpeechCallbacks';
import { useSpeechController } from './speech-execution/useSpeechController';

/**
 * Refactored speech execution hook with modular components
 */
export const useSpeechExecution = (
  findVoice: (region: 'US' | 'UK' | 'AU') => SpeechSynthesisVoice | null,
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
  // Initialize modular hooks
  const { validatePreConditions, validateSpeechContent } = useSpeechValidation();
  
  const { handleSpeechError } = useSpeechErrorHandler(
    setHasSpeechPermission,
    handlePermissionError,
    incrementRetryAttempts,
    goToNextWord,
    paused,
    muted,
    wordTransitionRef,
    (inProgress: boolean) => {} // setPlayInProgress placeholder
  );
  
  const { createOnStartCallback, createOnEndCallback } = useSpeechCallbacks(
    speakingRef,
    setIsSpeaking,
    resetRetryAttempts,
    (inProgress: boolean) => {}, // setPlayInProgress placeholder
    paused,
    muted,
    wordTransitionRef,
    goToNextWord
  );
  
  const { executeSpeechSynthesis } = useSpeechController(findVoice, selectedVoice);

  const executeSpeech = useCallback(async (
    currentWord: VocabularyWord,
    speechableText: string,
    setPlayInProgress: (inProgress: boolean) => void
  ) => {
    const sessionId = Math.random().toString(36).substring(7);
    console.log(`[SPEECH-EXECUTION-${sessionId}] === Starting Modular Speech Process ===`);
    console.log(`[SPEECH-EXECUTION-${sessionId}] Word: "${currentWord.word}"`);
    console.log(`[SPEECH-EXECUTION-${sessionId}] Text length: ${speechableText.length}`);

    // Pre-flight validation
    if (!validatePreConditions(sessionId, currentWord, paused, muted, wordTransitionRef)) {
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

      // Validate speech content
      if (!validateSpeechContent(sessionId, speechableText, setPlayInProgress, goToNextWord)) {
        return false;
      }

      // Create callbacks
      const onStart = createOnStartCallback(sessionId);
      const onEnd = createOnEndCallback(sessionId);
      const onError = (event: SpeechSynthesisErrorEvent) => {
        handleSpeechError(sessionId, event, currentWord, speakingRef, setIsSpeaking);
      };

      // Execute speech synthesis
      return await executeSpeechSynthesis(
        sessionId,
        currentWord,
        speechableText,
        onStart,
        onEnd,
        onError,
        setPlayInProgress,
        goToNextWord,
        paused,
        muted
      );
      
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
    validatePreConditions,
    validateSpeechContent,
    createOnStartCallback,
    createOnEndCallback,
    handleSpeechError,
    executeSpeechSynthesis,
    checkSpeechPermissions,
    handlePermissionError,
    goToNextWord,
    paused,
    muted,
    wordTransitionRef,
    speakingRef,
    setIsSpeaking
  ]);

  return {
    executeSpeech
  };
};
