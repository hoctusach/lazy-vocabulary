
import * as React from 'react';
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { useSpeechValidation } from './speech-execution/useSpeechValidation';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

/**
 * Hook for executing speech with comprehensive error handling and state management
 */
export const useSpeechExecution = (
  selectedVoice: VoiceSelection,
  setIsSpeaking: (isSpeaking: boolean) => void,
  speakingRef: React.MutableRefObject<boolean>,
  paused: boolean,
  muted: boolean,
  wordTransitionRef: React.MutableRefObject<boolean>
) => {
  const { validatePreConditions, validateSpeechContent } = useSpeechValidation();
  
  const executeSpeech = useCallback(async (
    currentWord: VocabularyWord,
    speechableText: string,
    setPlayInProgress: (inProgress: boolean) => void
  ): Promise<boolean> => {
    const sessionId = `speech-${Date.now()}`;

    // Pre-condition validation
    if (!validatePreConditions(sessionId, currentWord, paused, muted, wordTransitionRef)) {
      setPlayInProgress(false);
      return false;
    }

    // Content validation
    if (!validateSpeechContent(sessionId, speechableText, setPlayInProgress)) {
      return false;
    }

    try {
      setIsSpeaking(true);
      speakingRef.current = true;

      // Trigger speech via unified controller and wait for completion
      const success = await unifiedSpeechController.speak(
        currentWord,
        selectedVoice.region,
        selectedVoice.label
      );

      setIsSpeaking(false);
      speakingRef.current = false;
      setPlayInProgress(false);

      return success;
    } catch (error) {
      setPlayInProgress(false);
      setIsSpeaking(false);
      speakingRef.current = false;
      return false;
    }
  }, [
    validatePreConditions,
    validateSpeechContent,
    paused,
    muted,
    wordTransitionRef,
    selectedVoice,
    setIsSpeaking,
    speakingRef
  ]);

  return {
    executeSpeech
  };
};
