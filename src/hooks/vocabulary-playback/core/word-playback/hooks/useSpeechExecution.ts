
import * as React from 'react';
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { useSpeechValidation } from './speech-execution/useSpeechValidation';
import { useSpeechCallbacks } from './speech-execution/useSpeechCallbacks';
import { useSpeechErrorHandler } from './speech-execution/useSpeechErrorHandler';
import { useSpeechController } from './speech-execution/useSpeechController';

/**
 * Hook for executing speech with comprehensive error handling and state management
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
    if (!validateSpeechContent(sessionId, speechableText, setPlayInProgress, goToNextWord)) {
      return false;
    }

    try {
      setIsSpeaking(true);
      speakingRef.current = true;
      
      // Simple speech execution with auto-advance
      setTimeout(() => {
        setIsSpeaking(false);
        speakingRef.current = false;
        setPlayInProgress(false);
        
        if (!paused && !muted) {
          scheduleAutoAdvance(1500);
        }
      }, Math.max(2000, speechableText.length * 40));
      
      return true;
    } catch (error) {
      setPlayInProgress(false);
      setIsSpeaking(false);
      speakingRef.current = false;
      
      if (!paused && !muted) {
        scheduleAutoAdvance(2000);
      }
      return false;
    }
  }, [
    validatePreConditions,
    validateSpeechContent,
    paused,
    muted,
    wordTransitionRef,
    goToNextWord,
    scheduleAutoAdvance,
    setIsSpeaking,
    speakingRef
  ]);

  return {
    executeSpeech
  };
};
