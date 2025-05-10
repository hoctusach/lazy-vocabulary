
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

  // Custom pause handler that uses the soft-pause approach
  const handlePauseResume = (isPaused: boolean) => {
    if (isPaused) {
      // If we're resuming, call the regular toggle function and also resume speech
      resumeSpeaking();
      return true; // Return the new state (unpaused)
    } else {
      // If we're pausing, use our soft-pause approach
      pauseSpeaking(); // This now sets pauseRequestedRef.current = true
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
