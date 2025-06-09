
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { usePlayInProgress } from './usePlayInProgress';
import { useCurrentWordCalculation } from './useCurrentWordCalculation';
import { usePlaybackExecution } from './usePlaybackExecution';
import { useSpeechPermissionManager } from './useSpeechPermissionManager';

/**
 * Hook that orchestrates the complete playback process
 * Simplified to delegate to smaller, focused hooks
 */
export const usePlaybackOrchestrator = (
  wordList: VocabularyWord[],
  currentIndex: number,
  muted: boolean,
  paused: boolean,
  findVoice: (region: 'US' | 'UK') => SpeechSynthesisVoice | null,
  selectedVoice: VoiceSelection,
  setIsSpeaking: (isSpeaking: boolean) => void,
  speakingRef: React.MutableRefObject<boolean>,
  resetRetryAttempts: () => void,
  incrementRetryAttempts: () => boolean,
  checkSpeechSupport: () => boolean,
  wordTransitionRef: React.MutableRefObject<boolean>,
  goToNextWord: () => void,
  voicesLoadedRef: React.MutableRefObject<boolean>,
  ensureVoicesLoaded: () => Promise<boolean>,
  permissionErrorShownRef: React.MutableRefObject<boolean>
) => {
  // Calculate current word using dedicated hook
  const { currentWord } = useCurrentWordCalculation(wordList, currentIndex);
  
  // Use play in progress management
  const { playInProgressRef, setPlayInProgress, isPlayInProgress } = usePlayInProgress();

  const resetPlayInProgress = useCallback(() => {
    console.log('[PLAYBACK-ORCHESTRATOR] Resetting play in progress flag');
    playInProgressRef.current = false;
  }, [playInProgressRef]);
  
  // Use the permission manager for speech permissions
  const { hasSpeechPermission } = useSpeechPermissionManager();
  
  // Use playback execution logic
  const { executePlayback } = usePlaybackExecution(
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
    checkSpeechSupport,
    voicesLoadedRef,
    ensureVoicesLoaded
  );

  const playCurrentWord = useCallback(async () => {
    if (!currentWord) {
      console.log('[PLAYBACK-ORCHESTRATOR] No current word available');
      return;
    }

    await executePlayback(currentWord, setPlayInProgress, isPlayInProgress, resetPlayInProgress);
  }, [currentWord, executePlayback, setPlayInProgress, isPlayInProgress, resetPlayInProgress]);

  return {
    currentWord,
    playCurrentWord,
    hasSpeechPermission,
    resetPlayInProgress
  };
};
