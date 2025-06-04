
import { useCallback, useState } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { speechController } from '@/utils/speech/core/speechController';
import { usePlayInProgress } from './usePlayInProgress';
import { useContentValidation } from './useContentValidation';
import { useSpeechExecution } from './useSpeechExecution';
import { toast } from 'sonner';

/**
 * Hook that orchestrates the complete playback flow with improved debugging
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
    
    const debugState = {
      hasCurrentWord: !!currentWord,
      wordText: currentWord?.word,
      muted,
      paused,
      playInProgress: isPlayInProgress(),
      wordTransition: wordTransitionRef.current,
      controllerActive: speechController.isActive(),
      controllerState: speechController.getState(),
      browserSpeaking: window.speechSynthesis?.speaking,
      browserPaused: window.speechSynthesis?.paused
    };
    
    console.log('[PLAYBACK-FLOW] Current conditions:', debugState);

    // Prevent overlapping play attempts
    if (isPlayInProgress()) {
      console.log('[PLAYBACK-FLOW] Play already in progress, skipping');
      return;
    }

    // Enhanced controller state check with forced recovery
    const controllerActive = speechController.isActive();
    console.log('[PLAYBACK-FLOW] Speech controller state check:', {
      controllerActive,
      shouldAttemptRecovery: controllerActive && !window.speechSynthesis.speaking
    });

    if (controllerActive) {
      const actualSpeaking = window.speechSynthesis?.speaking || false;
      const actualPaused = window.speechSynthesis?.paused || false;
      
      if (!actualSpeaking && !actualPaused) {
        console.log('[PLAYBACK-FLOW] Controller thinks it\'s active but browser isn\'t speaking - forcing reset');
        speechController.forceReset();
        // Wait for reset to complete
        await new Promise(resolve => setTimeout(resolve, 200));
      } else if (muted || paused) {
        console.log('[PLAYBACK-FLOW] Forcing controller reset due to mute/pause state');
        speechController.forceReset();
        await new Promise(resolve => setTimeout(resolve, 200));
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

      // Validate and prepare content with enhanced logging
      const { speechableText, hasValidContent } = validateAndPrepareContent(currentWord);
      
      console.log('[PLAYBACK-FLOW] Content validation result:', {
        hasValidContent,
        speechableTextLength: speechableText.length,
        speechableTextPreview: speechableText.substring(0, 100) + '...'
      });
      
      if (!hasValidContent) {
        console.log('[PLAYBACK-FLOW] No valid content to speak, advancing');
        setTimeout(() => goToNextWord(), 2000);
        setPlayInProgress(false);
        return;
      }

      // Execute speech with the validated content
      console.log('[PLAYBACK-FLOW] Executing speech with validated content');
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
