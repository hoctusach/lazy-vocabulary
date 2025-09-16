import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { SpeechState } from '@/services/speech/core/SpeechState';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';
import { toast } from 'sonner';
import { setFavoriteVoice } from '@/lib/preferences/localPreferences';

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
  const togglePause = useCallback(() => {
    const newPausedState = !isPaused;
    console.log(`[VOCABULARY-CONTROLS] Toggle pause: ${isPaused} -> ${newPausedState}`);
    setIsPaused(newPausedState);
  }, [isPaused, setIsPaused]);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    console.log(`[VOCABULARY-CONTROLS] Toggle mute: ${isMuted} -> ${newMutedState}`);
    setIsMuted(newMutedState);
    if (newMutedState) unifiedSpeechController.stop();
  }, [isMuted, setIsMuted]);

  const toggleVoice = useCallback(() => {
    if (allVoices.length < 2) return;
    const currentIndex = allVoices.findIndex(v => v.name === selectedVoiceName);
    const nextIndex = (currentIndex + 1) % allVoices.length;
    const nextVoice = allVoices[nextIndex];
    setSelectedVoiceName(nextVoice.name);
    setFavoriteVoice(nextVoice.name);
    unifiedSpeechController.stop();
    toast.success(`Voice changed to ${nextVoice.name} (${nextVoice.lang})`);
  }, [allVoices, selectedVoiceName, setSelectedVoiceName]);

  const switchCategory = useCallback(() => {
    console.log('[VOCABULARY-CONTROLS] Switching category');
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
