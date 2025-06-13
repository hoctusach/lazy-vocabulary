
import { useCallback } from 'react';
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
  findVoice: (region: 'US' | 'UK' | 'AU') => SpeechSynthesisVoice | null,
  selectedVoice: VoiceSelection,
  setIsSpeaking: (isSpeaking: boolean) => void,
  speakingRef: React.MutableRefObject<boolean>,
  resetRetryAttempts: () => void,
  incrementRetryAttempts: () => boolean,
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
  
  // Permissions are always granted in this simplified setup
  
  const { executeSpeech } = useSpeechExecution(
    findVoice,
    selectedVoice,
    setIsSpeaking,
    speakingRef,
    resetRetryAttempts,
    incrementRetryAttempts,
    paused,
    muted,
    wordTransitionRef,
    goToNextWord,
    scheduleAutoAdvance
  );

  const executePlayback = useCallback(async (
    currentWord: VocabularyWord,
    setPlayInProgress: (inProgress: boolean) => void,
    isPlayInProgress: () => boolean,
    resetPlayInProgress: () => void
  ) => {
    console.log('[PLAYBACK-EXECUTION] === Starting executePlayback ===');
    
    const debugState = {
      hasCurrentWord: !!currentWord,
      wordText: currentWord?.word,
      muted,
      paused,
      playInProgress: isPlayInProgress(),
      wordTransition: wordTransitionRef.current,
    };
    
    console.log('[PLAYBACK-EXECUTION] Current conditions:', debugState);

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
        console.log('[PLAYBACK-EXECUTION] Speech is muted, auto-advancing after delay');
        scheduleAutoAdvance(3000);
      } else if (conditionCheck.reason === 'word-transition') {
        setTimeout(() => executePlayback(currentWord, setPlayInProgress, isPlayInProgress, resetPlayInProgress), 150);
      }
      return;
    }

    // Set play in progress flag
    setPlayInProgress(true);
    console.log('[PLAYBACK-EXECUTION] Starting speech process for:', currentWord.word);
    
    try {
      // Ensure voices are loaded
      if (!voicesLoadedRef.current) {
        console.log('[PLAYBACK-EXECUTION] Ensuring voices are loaded');
        await ensureVoicesLoaded();
      }
      
      // Ensure speech synthesis is available
      if (!checkSpeechSupport()) {
        toast.error("Your browser doesn't support speech synthesis");
        scheduleAutoAdvance(3000);
        setPlayInProgress(false);
        return;
      }

      console.log(`[PLAYBACK-EXECUTION] Processing word for speech: ${currentWord.word}`);

      // Validate and prepare content with enhanced logging
      const { speechableText } = validateAndPrepareContent(currentWord);

      console.log('[PLAYBACK-EXECUTION] Content validation result:', {
        speechableTextLength: speechableText.length,
        speechableTextPreview: speechableText.substring(0, 100) + '...'
      });

      if (speechableText.trim().length === 0) {
        console.log('[PLAYBACK-EXECUTION] No valid content to speak, advancing');
        scheduleAutoAdvance(2000);
        setPlayInProgress(false);
        return;
      }

      // Execute speech with the validated content
      console.log('[PLAYBACK-EXECUTION] Executing speech with validated content');
      await executeSpeech(currentWord, speechableText, setPlayInProgress);
      
    } catch (error) {
      console.error('[PLAYBACK-EXECUTION] Error in executePlayback:', error);
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
