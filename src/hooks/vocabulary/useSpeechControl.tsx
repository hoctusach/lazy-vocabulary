
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

  // Enhanced pause handler that ensures speech resumes properly
  const handlePauseResume = (isPaused: boolean) => {
    if (isPaused) {
      // If we're unpausing (currently paused), resume speech
      console.log("Resuming speech playback and enabling auto-advance");
      resumeSpeaking();
      
      // Reset pauseRequestedRef to ensure auto-advance works again
      if (pauseRequestedRef) {
        pauseRequestedRef.current = false;
      }
      
      return true; // Return the new state (unpaused)
    } else {
      // If we're pausing (currently playing), pause speech
      console.log("Pausing speech playback and auto-advance");
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
