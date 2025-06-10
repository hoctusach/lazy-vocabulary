
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { usePlayInProgress } from './usePlayInProgress';
import { useCurrentWordCalculation } from './useCurrentWordCalculation';
import { usePlaybackExecution } from './usePlaybackExecution';
import { useSpeechPermissionManager } from './useSpeechPermissionManager';
import { usePlaybackCoordination } from './usePlaybackCoordination';

/**
 * Core orchestrator logic that ties together all the smaller hooks
 */
export const useOrchestratorCore = (
  wordList: VocabularyWord[],
  currentIndex: number,
  muted: boolean,
  paused: boolean,
  findVoice: (region: 'US' | 'UK') => SpeechSynthesisVoice | null,
  selectedVoice: any,
  setIsSpeaking: (isSpeaking: boolean) => void,
  speakingRef: React.MutableRefObject<boolean>,
  resetRetryAttempts: () => void,
  incrementRetryAttempts: () => boolean,
  checkSpeechSupport: () => boolean,
  wordTransitionRef: React.MutableRefObject<boolean>,
  goToNextWord: (fromUser?: boolean) => void,
  scheduleAutoAdvance: (delay: number) => void,
  lastManualActionTimeRef: React.MutableRefObject<number>,
  autoAdvanceTimerRef: React.MutableRefObject<number | null>,
  voicesLoadedRef: React.MutableRefObject<boolean>,
  ensureVoicesLoaded: () => Promise<boolean>,
  permissionErrorShownRef: React.MutableRefObject<boolean>
) => {
  // Calculate current word using dedicated hook
  const { currentWord } = useCurrentWordCalculation(wordList, currentIndex);
  
  // Use play in progress management
  const { playInProgressRef, setPlayInProgress, isPlayInProgress } = usePlayInProgress();

  const resetPlayInProgress = useCallback(() => {
    console.log('[ORCHESTRATOR-CORE] Resetting play in progress flag');
    playInProgressRef.current = false;
  }, [playInProgressRef]);
  
  // Use the permission manager for speech permissions
  const { hasSpeechPermission } = useSpeechPermissionManager();
  
  // Create playback coordination context
  const { createPlaybackContext } = usePlaybackCoordination(
    findVoice,
    selectedVoice,
    setIsSpeaking,
    speakingRef,
    resetRetryAttempts,
    incrementRetryAttempts,
    checkSpeechSupport,
    wordTransitionRef,
    goToNextWord,
    voicesLoadedRef,
    ensureVoicesLoaded,
    permissionErrorShownRef,
    paused,
    muted
  );
  
  // Use playback execution logic
  const { executePlayback } = usePlaybackExecution(
    findVoice,
    selectedVoice,
    setIsSpeaking,
    speakingRef,
    resetRetryAttempts,
    incrementRetryAttempts,
    goToNextWord,
    scheduleAutoAdvance,
    lastManualActionTimeRef,
    autoAdvanceTimerRef,
    paused,
    muted,
    wordTransitionRef,
    permissionErrorShownRef,
    checkSpeechSupport,
    voicesLoadedRef,
    ensureVoicesLoaded
  );

  const playCurrentWord = useCallback(async () => {
    if (!currentWord) {
      console.log('[ORCHESTRATOR-CORE] No current word available');
      return;
    }

    await executePlayback(currentWord, setPlayInProgress, isPlayInProgress, resetPlayInProgress);
  }, [currentWord, executePlayback, setPlayInProgress, isPlayInProgress, resetPlayInProgress]);

  return {
    currentWord,
    playCurrentWord,
    hasSpeechPermission,
    resetPlayInProgress,
    playbackContext: createPlaybackContext()
  };
};
