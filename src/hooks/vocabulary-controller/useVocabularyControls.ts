
import { useCallback } from 'react';
import { directSpeechService } from '@/services/speech/directSpeechService';
import { toast } from 'sonner';

/**
 * Control functions for pause, mute, and voice toggling
 */
export const useVocabularyControls = (
  isPaused: boolean,
  setIsPaused: (paused: boolean) => void,
  isMuted: boolean,
  setIsMuted: (muted: boolean) => void,
  voiceRegion: 'US' | 'UK',
  setVoiceRegion: (region: 'US' | 'UK') => void,
  pausedRef: React.RefObject<boolean>,
  mutedRef: React.RefObject<boolean>,
  currentWordRef: React.RefObject<any>,
  setIsSpeaking: (speaking: boolean) => void,
  clearAutoPlay: () => void,
  playCurrentWord: () => void,
  getRegionTiming: (region: 'US' | 'UK') => any
) => {
  // Enhanced control functions with region-aware timing
  const togglePause = useCallback(() => {
    console.log('[VOCAB-CONTROLS] togglePause called');
    
    const newPaused = !isPaused;
    const timing = getRegionTiming(voiceRegion);
    
    // Update state immediately
    setIsPaused(newPaused);
    pausedRef.current = newPaused;
    
    if (newPaused) {
      // Immediate pause
      console.log('[VOCAB-CONTROLS] ✓ PAUSING - stopping speech immediately');
      clearAutoPlay();
      directSpeechService.stop();
      setIsSpeaking(false);
      toast.info("Playback paused");
    } else {
      // Resume with region-specific timing
      console.log(`[VOCAB-CONTROLS] ✓ RESUMING - will play current word in ${timing.resumeDelay}ms`);
      if (!mutedRef.current && currentWordRef.current) {
        setTimeout(() => {
          if (!pausedRef.current) {
            playCurrentWord();
          }
        }, timing.resumeDelay);
      }
      toast.success("Playback resumed");
    }
  }, [isPaused, clearAutoPlay, playCurrentWord, getRegionTiming, voiceRegion, setIsPaused, pausedRef, mutedRef, currentWordRef, setIsSpeaking]);

  const toggleMute = useCallback(() => {
    console.log('[VOCAB-CONTROLS] toggleMute called');
    
    const newMuted = !isMuted;
    const timing = getRegionTiming(voiceRegion);
    
    // Update state immediately
    setIsMuted(newMuted);
    mutedRef.current = newMuted;
    
    if (newMuted) {
      // Immediate mute
      console.log('[VOCAB-CONTROLS] ✓ MUTING - stopping speech immediately');
      clearAutoPlay();
      directSpeechService.stop();
      setIsSpeaking(false);
      toast.info("Audio muted");
    } else {
      // Unmute with region-specific timing
      console.log(`[VOCAB-CONTROLS] ✓ UNMUTING - will play current word in ${timing.resumeDelay}ms`);
      if (!pausedRef.current && currentWordRef.current) {
        setTimeout(() => {
          if (!mutedRef.current) {
            playCurrentWord();
          }
        }, timing.resumeDelay);
      }
      toast.success("Audio unmuted");
    }
  }, [isMuted, clearAutoPlay, playCurrentWord, getRegionTiming, voiceRegion, setIsMuted, pausedRef, mutedRef, currentWordRef, setIsSpeaking]);

  const toggleVoice = useCallback(() => {
    console.log('[VOCAB-CONTROLS] toggleVoice called');
    
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
  }, [voiceRegion, playCurrentWord, getRegionTiming, setVoiceRegion, pausedRef, mutedRef, currentWordRef, setIsSpeaking]);

  return {
    togglePause,
    toggleMute,
    toggleVoice
  };
};
