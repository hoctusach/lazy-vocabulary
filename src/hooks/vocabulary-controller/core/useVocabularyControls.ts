
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { SpeechState } from '@/services/speech/core/SpeechState';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';
import { toast } from 'sonner';
import { PREFERRED_VOICE_KEY } from '@/utils/storageKeys';

/**
 * Vocabulary control actions
 * Enhanced for mobile responsiveness
 */
export const useVocabularyControls = (
  isPaused: boolean,
  setIsPaused: (paused: boolean) => void,
  isMuted: boolean,
  setIsMuted: (muted: boolean) => void,
  allVoices: SpeechSynthesisVoice[],
  selectedVoiceName: string,
  setSelectedVoiceName: (name: string) => void,
  speechState: SpeechState,
  currentWord: VocabularyWord | null
) => {
  // Toggle pause with immediate feedback for mobile
  const togglePause = useCallback(() => {
    const newPausedState = !isPaused;
    console.log(`[VOCABULARY-CONTROLS] Toggle pause: ${isPaused} -> ${newPausedState}`);
    
    // Update state immediately for responsive UI
    setIsPaused(newPausedState);
    
    // Do not interrupt current speech; just update state
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

  // Cycle to the next available voice
  const toggleVoice = useCallback(() => {
    if (allVoices.length < 2) return;
    const currentIndex = allVoices.findIndex(v => v.name === selectedVoiceName);
    const nextIndex = (currentIndex + 1) % allVoices.length;
    const nextVoice = allVoices[nextIndex];
    setSelectedVoiceName(nextVoice.name);
    localStorage.setItem('preferredVoiceName', nextVoice.name);
    unifiedSpeechController.stop();
    toast.success(`Voice changed to ${nextVoice.name} (${nextVoice.lang})`);
  }, [allVoices, selectedVoiceName, setSelectedVoiceName]);


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
