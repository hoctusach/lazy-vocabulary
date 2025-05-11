
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
      console.log("Resuming speech playback");
      resumeSpeaking();
      return true; // Return the new state (unpaused)
    } else {
      // If we're pausing (currently playing), pause speech
      console.log("Pausing speech playback");
      pauseSpeaking();
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
