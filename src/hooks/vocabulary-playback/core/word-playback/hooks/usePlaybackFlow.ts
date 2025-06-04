
import { useCallback, useState } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { speechController } from '@/utils/speech/core/speechController';
import { usePlayInProgress } from './usePlayInProgress';
import { useContentValidation } from './useContentValidation';
import { useSpeechExecution } from './useSpeechExecution';
import { toast } from 'sonner';

/**
 * Hook that orchestrates the complete playback flow
 */
export const usePlaybackFlow = (
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
  // Get the current word based on the index
  const currentWord = wordList.length > 0 ? wordList[currentIndex] : null;
  
  // State for speech permission
  const [hasSpeechPermission, setHasSpeechPermission] = useState(true);
  
  // Use our smaller hooks
  const { setPlayInProgress, isPlayInProgress } = usePlayInProgress();
  const { validateAndPrepareContent } = useContentValidation();
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
    setHasSpeechPermission
  );

  const playCurrentWord = useCallback(async () => {
    console.log('[PLAYBACK-FLOW] === Starting playCurrentWord ===');
    console.log('[PLAYBACK-FLOW] Current conditions:', {
      hasCurrentWord: !!currentWord,
      wordText: currentWord?.word,
      muted,
      paused,
      playInProgress: isPlayInProgress(),
      wordTransition: wordTransitionRef.current,
      controllerActive: speechController.isActive(),
      browserSpeaking: window.speechSynthesis?.speaking,
      browserPaused: window.speechSynthesis?.paused
    });

    // Prevent overlapping play attempts
    if (isPlayInProgress()) {
      console.log('[PLAYBACK-FLOW] Play already in progress, skipping');
      return;
    }

    // Check controller state with improved logic
    const controllerActive = speechController.isActive();
    console.log('[PLAYBACK-FLOW] Speech controller state check:', {
      controllerActive,
      shouldBlock: controllerActive
    });

    if (controllerActive) {
      console.log('[PLAYBACK-FLOW] Speech controller active, checking if we should force reset...');
      
      // If muted or paused, force reset the controller to allow new operations
      if (muted || paused) {
        console.log('[PLAYBACK-FLOW] Forcing controller reset due to mute/pause state');
        speechController.forceReset();
      } else {
        console.log('[PLAYBACK-FLOW] Controller legitimately active, skipping');
        return;
      }
    }
    
    // Don't try to play during word transitions
    if (wordTransitionRef.current) {
      console.log('[PLAYBACK-FLOW] Word transition in progress, delaying playback');
      return;
    }
    
    // Basic checks
    if (!currentWord) {
      console.log('[PLAYBACK-FLOW] No current word to play');
      return;
    }
    
    if (muted) {
      console.log('[PLAYBACK-FLOW] Speech is muted, auto-advancing after delay');
      setTimeout(() => goToNextWord(), 3000);
      return;
    }
    
    if (paused) {
      console.log('[PLAYBACK-FLOW] Playback is paused');
      return;
    }

    // Set play in progress flag
    setPlayInProgress(true);
    console.log('[PLAYBACK-FLOW] Starting speech process for:', currentWord.word);
    
    try {
      // Ensure voices are loaded
      if (!voicesLoadedRef.current) {
        console.log('[PLAYBACK-FLOW] Ensuring voices are loaded');
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

      console.log(`[PLAYBACK-FLOW] Processing word for speech: ${currentWord.word}`);

      // Validate and prepare content
      const { speechableText, hasValidContent } = validateAndPrepareContent(currentWord);
      
      if (!hasValidContent) {
        setTimeout(() => goToNextWord(), 2000);
        setPlayInProgress(false);
        return;
      }

      // Execute speech
      await executeSpeech(currentWord, speechableText, setPlayInProgress);
      
    } catch (error) {
      console.error('[PLAYBACK-FLOW] Error in playCurrentWord:', error);
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
    speakingRef
  ]);

  return {
    currentWord,
    playCurrentWord,
    hasSpeechPermission
  };
};
