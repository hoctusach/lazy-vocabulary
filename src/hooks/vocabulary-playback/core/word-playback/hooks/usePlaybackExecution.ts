import * as React from 'react';
import { useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { useContentValidation } from './useContentValidation';
import { useUnifiedValidation } from './useUnifiedValidation';
import { useSpeechExecution } from './useSpeechExecution';
import { toast } from 'sonner';

/**
 * Hook for executing the playback process
 */
export const usePlaybackExecution = (
  selectedVoice: VoiceSelection,
  setIsSpeaking: (isSpeaking: boolean) => void,
  speakingRef: React.MutableRefObject<boolean>,
  goToNextWord: (fromUser?: boolean) => void,
  scheduleAutoAdvance: (delay: number) => void,
  lastManualActionTimeRef: React.MutableRefObject<number>,
  autoAdvanceTimerRef: React.MutableRefObject<number | null>,
  paused: boolean,
  muted: boolean,
  wordTransitionRef: React.MutableRefObject<boolean>,
  checkSpeechSupport: () => boolean,
  voicesLoadedRef: React.MutableRefObject<boolean>,
  ensureVoicesLoaded: () => Promise<boolean>
) => {
  const { validateAndPrepareContent } = useContentValidation();
  const { checkAll } = useUnifiedValidation();
  
  const { executeSpeech } = useSpeechExecution(
    selectedVoice,
    setIsSpeaking,
    speakingRef,
    paused,
    muted,
    wordTransitionRef
  );

  const executePlayback = useCallback(async (
    currentWord: VocabularyWord,
    setPlayInProgress: (inProgress: boolean) => void,
    isPlayInProgress: () => boolean,
    resetPlayInProgress: () => void
  ) => {
    // Unified validation step
    const conditionCheck = checkAll(
      currentWord,
      muted,
      paused,
      isPlayInProgress,
      resetPlayInProgress,
      wordTransitionRef
    );

    if (!conditionCheck.canPlay) {
      if (conditionCheck.reason === 'muted') {
        scheduleAutoAdvance(3000);
      } else if (conditionCheck.reason === 'word-transition') {
        setTimeout(() => executePlayback(currentWord, setPlayInProgress, isPlayInProgress, resetPlayInProgress), 150);
      }
      return;
    }

    // Set play in progress flag
    setPlayInProgress(true);
    
    try {
      // Ensure voices are loaded
      if (!voicesLoadedRef.current) {
        await ensureVoicesLoaded();
      }
      
      // Ensure speech synthesis is available
      if (!checkSpeechSupport()) {
        toast.error("Your browser doesn't support speech synthesis");
        scheduleAutoAdvance(3000);
        setPlayInProgress(false);
        return;
      }

      // Validate and prepare content
      const { speechableText } = validateAndPrepareContent(currentWord);

      if (speechableText.trim().length === 0) {
        scheduleAutoAdvance(2000);
        setPlayInProgress(false);
        return;
      }

      // Execute speech with the validated content
      await executeSpeech(currentWord, speechableText, setPlayInProgress);
      
    } catch (error) {
      console.error('Error in executePlayback:', error);
      setPlayInProgress(false);
      setIsSpeaking(false);
      speakingRef.current = false;
      
      // Still auto-advance to prevent getting stuck
      if (!paused && !muted) {
        scheduleAutoAdvance(3000);
      }
    }
  }, [
    muted,
    paused,
    wordTransitionRef,
    goToNextWord,
    voicesLoadedRef,
    ensureVoicesLoaded,
    checkSpeechSupport,
    validateAndPrepareContent,
    executeSpeech,
    setIsSpeaking,
    speakingRef,
    checkAll,
    scheduleAutoAdvance
  ]);

  return {
    executePlayback
  };
};
