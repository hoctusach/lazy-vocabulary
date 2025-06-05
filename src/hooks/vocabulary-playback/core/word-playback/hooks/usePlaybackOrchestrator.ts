
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { usePlayInProgress } from './usePlayInProgress';
import { useContentValidation } from './useContentValidation';
import { useSpeechExecution } from './useSpeechExecution';
import { usePlaybackConditions } from './usePlaybackConditions';
import { useSpeechPermissionManager } from './useSpeechPermissionManager';
import { toast } from 'sonner';

/**
 * Hook that orchestrates the complete playback process
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
  // Enhanced current word calculation with comprehensive debugging
  const currentWord = (() => {
    console.log('[PLAYBACK-ORCHESTRATOR] === Current Word Calculation Debug ===');
    console.log('[PLAYBACK-ORCHESTRATOR] Word list length:', wordList?.length || 0);
    console.log('[PLAYBACK-ORCHESTRATOR] Current index:', currentIndex);
    console.log('[PLAYBACK-ORCHESTRATOR] Word list sample:', wordList?.slice(0, 3).map(w => w.word));
    
    if (!wordList || wordList.length === 0) {
      console.log('[PLAYBACK-ORCHESTRATOR] No word list available');
      return null;
    }
    
    if (currentIndex < 0 || currentIndex >= wordList.length) {
      console.log('[PLAYBACK-ORCHESTRATOR] Index out of bounds, clamping to valid range');
      const clampedIndex = Math.max(0, Math.min(currentIndex, wordList.length - 1));
      const word = wordList[clampedIndex];
      console.log('[PLAYBACK-ORCHESTRATOR] Clamped index:', clampedIndex, 'Word:', word?.word);
      return word;
    }
    
    const word = wordList[currentIndex];
    console.log('[PLAYBACK-ORCHESTRATOR] Selected word at index', currentIndex, ':', word?.word);
    return word;
  })();
  
  // Use our smaller hooks
  const { playInProgressRef, setPlayInProgress, isPlayInProgress } = usePlayInProgress();

  const resetPlayInProgress = useCallback(() => {
    console.log('[PLAYBACK-ORCHESTRATOR] Resetting play in progress flag');
    playInProgressRef.current = false;
  }, [playInProgressRef]);
  
  const { validateAndPrepareContent } = useContentValidation();
  const { checkPlaybackConditions, handleControllerReset } = usePlaybackConditions();
  
  // Use the permission manager for speech permissions
  const { 
    hasSpeechPermission, 
    setHasSpeechPermission,
    checkSpeechPermissions,
    handlePermissionError 
  } = useSpeechPermissionManager();
  
  const { executeSpeech } = useSpeechExecution(
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
    setHasSpeechPermission,
    handlePermissionError,
    checkSpeechPermissions
  );

  const playCurrentWord = useCallback(async () => {
    console.log('[PLAYBACK-ORCHESTRATOR] === Starting playCurrentWord ===');
    
    const debugState = {
      hasCurrentWord: !!currentWord,
      wordText: currentWord?.word,
      wordListLength: wordList?.length || 0,
      currentIndex,
      muted,
      paused,
      playInProgress: isPlayInProgress(),
      wordTransition: wordTransitionRef.current,
    };
    
    console.log('[PLAYBACK-ORCHESTRATOR] Current conditions:', debugState);

    // Check playback conditions
    const conditionCheck = checkPlaybackConditions(
      currentWord,
      muted,
      paused,
      isPlayInProgress,
      resetPlayInProgress,
      wordTransitionRef
    );

    if (!conditionCheck.canPlay) {
      if (conditionCheck.reason === 'controller-reset-needed') {
        await handleControllerReset();
      } else if (conditionCheck.reason === 'muted') {
        console.log('[PLAYBACK-ORCHESTRATOR] Speech is muted, auto-advancing after delay');
        setTimeout(() => goToNextWord(), 3000);
      }
      return;
    }

    // Set play in progress flag
    setPlayInProgress(true);
    console.log('[PLAYBACK-ORCHESTRATOR] Starting speech process for:', currentWord!.word);
    
    try {
      // Ensure voices are loaded
      if (!voicesLoadedRef.current) {
        console.log('[PLAYBACK-ORCHESTRATOR] Ensuring voices are loaded');
        await ensureVoicesLoaded();
      }
      
      // Ensure speech synthesis is available
      if (!checkSpeechSupport()) {
        if (!permissionErrorShownRef.current) {
          toast.error("Your browser doesn't support speech synthesis");
          permissionErrorShownRef.current = true;
        }
        setTimeout(() => goToNextWord(), 3000);
        setPlayInProgress(false);
        return;
      }

      console.log(`[PLAYBACK-ORCHESTRATOR] Processing word for speech: ${currentWord!.word}`);

      // Validate and prepare content with enhanced logging
      const { speechableText, hasValidContent } = validateAndPrepareContent(currentWord!);
      
      console.log('[PLAYBACK-ORCHESTRATOR] Content validation result:', {
        hasValidContent,
        speechableTextLength: speechableText.length,
        speechableTextPreview: speechableText.substring(0, 100) + '...'
      });
      
      if (!hasValidContent) {
        console.log('[PLAYBACK-ORCHESTRATOR] No valid content to speak, advancing');
        setTimeout(() => goToNextWord(), 2000);
        setPlayInProgress(false);
        return;
      }

      // Execute speech with the validated content
      console.log('[PLAYBACK-ORCHESTRATOR] Executing speech with validated content');
      await executeSpeech(currentWord!, speechableText, setPlayInProgress);
      
    } catch (error) {
      console.error('[PLAYBACK-ORCHESTRATOR] Error in playCurrentWord:', error);
      setPlayInProgress(false);
      setIsSpeaking(false);
      speakingRef.current = false;
      
      // Still auto-advance to prevent getting stuck
      if (!paused && !muted) {
        setTimeout(() => goToNextWord(), 3000);
      }
    }
  }, [
    currentWord,
    wordList,
    currentIndex,
    muted,
    paused,
    isPlayInProgress,
    setPlayInProgress,
    wordTransitionRef,
    goToNextWord,
    voicesLoadedRef,
    ensureVoicesLoaded,
    checkSpeechSupport,
    permissionErrorShownRef,
    validateAndPrepareContent,
    executeSpeech,
    setIsSpeaking,
    speakingRef,
    checkPlaybackConditions,
    handleControllerReset
  ]);

  console.log('[PLAYBACK-ORCHESTRATOR] Final return - currentWord:', currentWord?.word);

  return {
    currentWord,
    playCurrentWord,
    hasSpeechPermission,
    resetPlayInProgress
  };
};
