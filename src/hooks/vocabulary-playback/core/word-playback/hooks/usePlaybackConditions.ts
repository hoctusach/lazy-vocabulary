
import { VocabularyWord } from '@/types/vocabulary';
import { speechController } from '@/utils/speech/core/speechController';

/**
 * Hook for checking playback conditions and state
 */
export const usePlaybackConditions = () => {
  const checkPlaybackConditions = (
    currentWord: VocabularyWord | null,
    muted: boolean,
    paused: boolean,
    isPlayInProgress: () => boolean,
    wordTransitionRef: React.MutableRefObject<boolean>
  ) => {
    console.log('[PLAYBACK-CONDITIONS] Checking conditions for playback');
    
    // Prevent overlapping play attempts
    if (isPlayInProgress()) {
      console.log('[PLAYBACK-CONDITIONS] Play already in progress, skipping');
      return { canPlay: false, reason: 'play-in-progress' };
    }

    // Enhanced controller state check with forced recovery
    const controllerActive = speechController.isActive();
    console.log('[PLAYBACK-CONDITIONS] Speech controller state check:', {
      controllerActive,
      shouldAttemptRecovery: controllerActive && !window.speechSynthesis.speaking
    });

    if (controllerActive) {
      const actualSpeaking = window.speechSynthesis?.speaking || false;
      const actualPaused = window.speechSynthesis?.paused || false;
      
      if (!actualSpeaking && !actualPaused) {
        console.log('[PLAYBACK-CONDITIONS] Controller thinks it\'s active but browser isn\'t speaking - needs reset');
        return { canPlay: false, reason: 'controller-reset-needed' };
      } else if (muted || paused) {
        console.log('[PLAYBACK-CONDITIONS] Forcing controller reset due to mute/pause state');
        return { canPlay: false, reason: 'controller-reset-needed' };
      } else {
        console.log('[PLAYBACK-CONDITIONS] Controller legitimately active, skipping');
        return { canPlay: false, reason: 'controller-active' };
      }
    }
    
    // Don't try to play during word transitions
    if (wordTransitionRef.current) {
      console.log('[PLAYBACK-CONDITIONS] Word transition in progress, delaying playback');
      return { canPlay: false, reason: 'word-transition' };
    }
    
    // Basic checks
    if (!currentWord) {
      console.log('[PLAYBACK-CONDITIONS] No current word to play');
      return { canPlay: false, reason: 'no-word' };
    }
    
    if (muted) {
      console.log('[PLAYBACK-CONDITIONS] Speech is muted');
      return { canPlay: false, reason: 'muted' };
    }
    
    if (paused) {
      console.log('[PLAYBACK-CONDITIONS] Playback is paused');
      return { canPlay: false, reason: 'paused' };
    }

    return { canPlay: true, reason: 'ready' };
  };

  const handleControllerReset = async () => {
    console.log('[PLAYBACK-CONDITIONS] Forcing controller reset');
    speechController.forceReset();
    // Wait for reset to complete
    await new Promise(resolve => setTimeout(resolve, 200));
  };

  return {
    checkPlaybackConditions,
    handleControllerReset
  };
};
