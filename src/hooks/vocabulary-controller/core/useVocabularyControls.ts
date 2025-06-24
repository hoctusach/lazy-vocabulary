
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { saveVoiceRegionToStorage } from '@/utils/speech/core/speechSettings';
import { SpeechState } from '@/services/speech/core/SpeechState';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

/**
 * Vocabulary control actions
 * Enhanced for mobile responsiveness
 */
export const useVocabularyControls = (
  isPaused: boolean,
  setIsPaused: (paused: boolean) => void,
  isMuted: boolean,
  setIsMuted: (muted: boolean) => void,
  voiceRegion: 'US' | 'UK' | 'AU',
  setVoiceRegion: (region: 'US' | 'UK' | 'AU') => void,
  speechState: SpeechState
) => {
  // Toggle pause with immediate feedback for mobile
  const togglePause = useCallback(() => {
    const newPausedState = !isPaused;
    console.log(`[VOCABULARY-CONTROLS] Toggle pause: ${isPaused} -> ${newPausedState}`);
    
    // Update state immediately for responsive UI
    setIsPaused(newPausedState);
    
    // Clear timers when pausing
    if (newPausedState) {
      unifiedSpeechController.stop();
    }
  }, [isPaused, setIsPaused]);

  // Toggle mute with immediate feedback
  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    console.log(`[VOCABULARY-CONTROLS] Toggle mute: ${isMuted} -> ${newMutedState}`);
    
    // Update state immediately for responsive UI
    setIsMuted(newMutedState);
    
    // Clear timers when muting
    if (newMutedState) {
      unifiedSpeechController.stop();
    }
  }, [isMuted, setIsMuted]);

  // Toggle voice region
  const toggleVoice = useCallback(() => {
    const voiceOrder: ('US' | 'UK' | 'AU')[] = ['US', 'UK', 'AU'];
    const currentIndex = voiceOrder.indexOf(voiceRegion);
    const nextIndex = (currentIndex + 1) % voiceOrder.length;
    const nextRegion = voiceOrder[nextIndex];
    
    console.log(`[VOCABULARY-CONTROLS] Toggle voice: ${voiceRegion} -> ${nextRegion}`);
    setVoiceRegion(nextRegion);
    saveVoiceRegionToStorage(nextRegion);
  }, [voiceRegion, setVoiceRegion]);

  // Switch category with mobile-friendly handling
  const switchCategory = useCallback(() => {
    console.log('[VOCABULARY-CONTROLS] Switching category');

    // Stop current speech during category switch
    unifiedSpeechController.stop();
    
    try {
      const newCategory = vocabularyService.nextSheet();
      console.log('[VOCABULARY-CONTROLS] Switched to category:', newCategory);
    } catch (error) {
      console.error('[VOCABULARY-CONTROLS] Error switching category:', error);
    }
  }, []);

  return {
    togglePause,
    toggleMute,
    toggleVoice,
    switchCategory
  };
};
