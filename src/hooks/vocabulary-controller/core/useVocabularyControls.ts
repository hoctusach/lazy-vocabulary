
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
  currentWord: VocabularyWord | null,
  speechState: SpeechState,
  playCurrentWord: () => Promise<void>,
  clearAutoAdvanceTimer: () => void,
  scheduleAutoAdvance: (delay: number, onAdvance?: () => void) => void
) => {
  // Toggle pause with immediate feedback for mobile
  const togglePause = useCallback(() => {
    const newPausedState = !isPaused;
    console.log(`[VOCABULARY-CONTROLS] Toggle pause: ${isPaused} -> ${newPausedState}`);
    
    // Update state immediately for responsive UI
    setIsPaused(newPausedState);
    
    // Clear timers when pausing
    if (newPausedState) {
      clearAutoAdvanceTimer();
    } else {
      // When resuming, try to play current word if not speaking
      if (currentWord && !speechState.isActive && !isMuted) {
        setTimeout(() => {
          playCurrentWord();
        }, 100);
      }
    }
  }, [isPaused, setIsPaused, clearAutoAdvanceTimer, currentWord, speechState.isActive, isMuted, playCurrentWord]);

  // Toggle mute with immediate feedback
  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    console.log(`[VOCABULARY-CONTROLS] Toggle mute: ${isMuted} -> ${newMutedState}`);
    
    // Update state immediately for responsive UI
    setIsMuted(newMutedState);
    
    // Clear timers when muting
    if (newMutedState) {
      clearAutoAdvanceTimer();
    } else {
      // When unmuting, try to play current word if not paused and not speaking
      if (currentWord && !isPaused && !speechState.isActive) {
        setTimeout(() => {
          playCurrentWord();
        }, 100);
      }
    }
  }, [isMuted, setIsMuted, clearAutoAdvanceTimer, currentWord, isPaused, speechState.isActive, playCurrentWord]);

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

    // Clear timers and stop current speech during category switch
    clearAutoAdvanceTimer();
    unifiedSpeechController.stop();
    
    try {
      const newCategory = vocabularyService.nextSheet();
      console.log('[VOCABULARY-CONTROLS] Switched to category:', newCategory);
      
      // Give time for the new category to load
      setTimeout(() => {
        if (!isPaused && !isMuted) {
          // Try to play the first word of the new category
          const newWord = vocabularyService.getCurrentWord();
          if (newWord) {
            playCurrentWord();
          }
        }
      }, 300);
      
    } catch (error) {
      console.error('[VOCABULARY-CONTROLS] Error switching category:', error);
    }
  }, [clearAutoAdvanceTimer, isPaused, isMuted, playCurrentWord, unifiedSpeechController]);

  return {
    togglePause,
    toggleMute,
    toggleVoice,
    switchCategory
  };
};
