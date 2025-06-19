
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

export const useSpeechControl = () => {
  // Speech synthesis for voice management
  const {
    isMuted,
    voiceRegion,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    pauseRequestedRef,
    speechError,
    hasSpeechPermission,
    retrySpeechInitialization
  } = useSpeechSynthesis();

  // Enhanced pause handler that ensures speech behavior is consistent
  const handlePauseResume = (isPaused: boolean) => {
    if (isPaused) {
      // If we're unpausing (currently paused)
      console.log("Resuming speech playback");
      resumeSpeaking();
      
      // Reset pauseRequestedRef to ensure auto-advance works again
      if (pauseRequestedRef) {
        pauseRequestedRef.current = false;
      }
      
      return true; // Return the new state (unpaused)
    } else {
      // If we're pausing (currently playing)
      console.log("Pausing speech playback");
      pauseSpeaking();
      
      // Set pauseRequestedRef to prevent auto-advance
      if (pauseRequestedRef) {
        pauseRequestedRef.current = true;
      }
      
      return false; // Return the new state (paused)
    }
  };

  return {
    isMuted,
    voiceRegion,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    pauseRequestedRef,
    speechError,
    hasSpeechPermission,
    retrySpeechInitialization,
    handlePauseResume
  };
};
