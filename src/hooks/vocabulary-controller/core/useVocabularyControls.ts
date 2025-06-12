
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';
import { vocabularyService } from '@/services/vocabularyService';

/**
 * Control actions (pause, mute, voice, category)
 */
export const useVocabularyControls = (
  isPaused: boolean,
  setIsPaused: (paused: boolean) => void,
  isMuted: boolean,
  setIsMuted: (muted: boolean) => void,
  voiceRegion: 'US' | 'UK' | 'AU',
  setVoiceRegion: (region: 'US' | 'UK' | 'AU') => void,
  currentWord: VocabularyWord | null,
  speechState: any,
  playCurrentWord: () => void,
  clearAutoAdvanceTimer: () => void,
  scheduleAutoAdvance: (delay: number) => void
) => {
  const togglePause = useCallback(() => {
    const newPaused = !isPaused;
    console.log(`[VOCABULARY-CONTROLS] Toggling pause: ${newPaused}`);
    
    // Clear auto-advance timer when pausing
    if (newPaused) {
      clearAutoAdvanceTimer();
    }
    
    setIsPaused(newPaused);
    
    if (newPaused) {
      unifiedSpeechController.pause();
    } else {
      unifiedSpeechController.resume();
      // Resume playback if needed
      if (currentWord && !isMuted) {
        setTimeout(() => playCurrentWord(), 100);
      }
    }
  }, [isPaused, currentWord, isMuted, playCurrentWord, clearAutoAdvanceTimer, setIsPaused]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    console.log(`[VOCABULARY-CONTROLS] Toggling mute: ${newMuted}`);
    
    // Clear auto-advance timer when muting
    if (newMuted) {
      clearAutoAdvanceTimer();
    }
    
    setIsMuted(newMuted);
    unifiedSpeechController.setMuted(newMuted);
    
    // Resume playback if unmuting
    if (!newMuted && !isPaused && currentWord) {
      setTimeout(() => playCurrentWord(), 100);
    } else if (newMuted) {
      // When muted, schedule auto-advance to continue cycling
      scheduleAutoAdvance(3000);
    }
  }, [isMuted, isPaused, currentWord, playCurrentWord, clearAutoAdvanceTimer, scheduleAutoAdvance, setIsMuted]);

  const toggleVoice = useCallback(() => {
    const regions: ('US' | 'UK' | 'AU')[] = ['US', 'UK', 'AU'];
    const currentRegionIndex = regions.indexOf(voiceRegion);
    const nextRegion = regions[(currentRegionIndex + 1) % regions.length];
    
    console.log(`[VOCABULARY-CONTROLS] Changing voice from ${voiceRegion} to ${nextRegion}`);
    setVoiceRegion(nextRegion);
    
    // Stop current speech and restart with new voice
    if (speechState.isActive) {
      unifiedSpeechController.stop();
      if (currentWord && !isPaused && !isMuted) {
        setTimeout(() => playCurrentWord(), 200);
      }
    }
  }, [voiceRegion, speechState.isActive, currentWord, isPaused, isMuted, playCurrentWord, setVoiceRegion]);

  const switchCategory = useCallback(() => {
    console.log('[VOCABULARY-CONTROLS] Switching category');
    
    // Clear auto-advance timer before category switch
    clearAutoAdvanceTimer();
    
    // Stop current speech
    unifiedSpeechController.stop();
    
    // Switch to next category
    const nextCategory = vocabularyService.nextSheet();
    console.log(`[VOCABULARY-CONTROLS] Switched to category: ${nextCategory}`);
    
    // Data will be reloaded via the vocabulary change listener
  }, [clearAutoAdvanceTimer]);

  return {
    togglePause,
    toggleMute,
    toggleVoice,
    switchCategory
  };
};
