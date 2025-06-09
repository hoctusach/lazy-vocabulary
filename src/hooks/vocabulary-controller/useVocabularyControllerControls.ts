
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { directSpeechService } from '@/services/speech/directSpeechService';
import { toast } from 'sonner';

/**
 * Handles control functions (pause, mute, voice) for the vocabulary controller
 */
export const useVocabularyControllerControls = (
  isPaused: boolean,
  isMuted: boolean,
  voiceRegion: 'US' | 'UK',
  setIsPaused: (paused: boolean) => void,
  setIsMuted: (muted: boolean) => void,
  setVoiceRegion: (region: 'US' | 'UK') => void,
  pausedRef: React.MutableRefObject<boolean>,
  mutedRef: React.MutableRefObject<boolean>,
  currentWordRef: React.MutableRefObject<VocabularyWord | null>,
  setIsSpeaking: (speaking: boolean) => void,
  clearAutoPlay: () => void,
  playCurrentWord: () => Promise<void>,
  getRegionTiming: (region: 'US' | 'UK') => { wordInterval: number; errorRetryDelay: number; resumeDelay: number }
) => {
  // Enhanced control functions with region-aware timing
  const togglePause = useCallback(() => {
    console.log('[VOCAB-CONTROLLER-CONTROLS] togglePause called');
    
    const newPaused = !isPaused;
    const timing = getRegionTiming(voiceRegion);
    
    // Update state immediately
    setIsPaused(newPaused);
    pausedRef.current = newPaused;
    
    if (newPaused) {
      // Immediate pause
      console.log('[VOCAB-CONTROLLER-CONTROLS] ✓ PAUSING - stopping speech immediately');
      clearAutoPlay();
      directSpeechService.stop();
      setIsSpeaking(false);
      toast.info("Playback paused");
    } else {
      // Resume with region-specific timing
      console.log(`[VOCAB-CONTROLLER-CONTROLS] ✓ RESUMING - will play current word in ${timing.resumeDelay}ms`);
      if (!mutedRef.current && currentWordRef.current) {
        setTimeout(() => {
          if (!pausedRef.current) {
            playCurrentWord();
          }
        }, timing.resumeDelay);
      }
      toast.success("Playback resumed");
    }
  }, [isPaused, setIsPaused, pausedRef, clearAutoPlay, setIsSpeaking, mutedRef, currentWordRef, playCurrentWord, getRegionTiming, voiceRegion]);

  const toggleMute = useCallback(() => {
    console.log('[VOCAB-CONTROLLER-CONTROLS] toggleMute called');
    
    const newMuted = !isMuted;
    const timing = getRegionTiming(voiceRegion);
    
    // Update state immediately
    setIsMuted(newMuted);
    mutedRef.current = newMuted;
    
    if (newMuted) {
      // Immediate mute
      console.log('[VOCAB-CONTROLLER-CONTROLS] ✓ MUTING - stopping speech immediately');
      clearAutoPlay();
      directSpeechService.stop();
      setIsSpeaking(false);
      toast.info("Audio muted");
    } else {
      // Unmute with region-specific timing
      console.log(`[VOCAB-CONTROLLER-CONTROLS] ✓ UNMUTING - will play current word in ${timing.resumeDelay}ms`);
      if (!pausedRef.current && currentWordRef.current) {
        setTimeout(() => {
          if (!mutedRef.current) {
            playCurrentWord();
          }
        }, timing.resumeDelay);
      }
      toast.success("Audio unmuted");
    }
  }, [isMuted, setIsMuted, mutedRef, clearAutoPlay, setIsSpeaking, pausedRef, currentWordRef, playCurrentWord, getRegionTiming, voiceRegion]);

  const toggleVoice = useCallback(() => {
    console.log('[VOCAB-CONTROLLER-CONTROLS] toggleVoice called');
    
    const newRegion = voiceRegion === 'US' ? 'UK' : 'US';
    const newTiming = getRegionTiming(newRegion);
    
    setVoiceRegion(newRegion);
    
    // Stop current speech and restart with new voice and timing
    directSpeechService.stop();
    setIsSpeaking(false);
    
    if (!pausedRef.current && !mutedRef.current && currentWordRef.current) {
      setTimeout(() => {
        playCurrentWord();
      }, newTiming.resumeDelay);
    }
    
    toast.success(`Voice changed to ${newRegion}`);
  }, [voiceRegion, setVoiceRegion, setIsSpeaking, pausedRef, mutedRef, currentWordRef, playCurrentWord, getRegionTiming]);

  return {
    togglePause,
    toggleMute,
    toggleVoice
  };
};
