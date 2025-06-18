
import { useEffect } from 'react';
import { BUTTON_STATES_KEY } from '@/utils/storageKeys';

export const useAudioMuteEffect = (
  mute: boolean,
  stopSpeaking: () => void,
  setIsSoundPlaying: (playing: boolean) => void
) => {
  // Effect specifically for mute changes
  useEffect(() => {
    // Store mute state in localStorage
    try {
      const buttonStates = JSON.parse(localStorage.getItem(BUTTON_STATES_KEY) || '{}');
      buttonStates.isMuted = mute;
      localStorage.setItem(BUTTON_STATES_KEY, JSON.stringify(buttonStates));
    } catch (e) {
      // Ignore localStorage errors
    }
    
    // When unmuting, don't automatically start speech again
    // Just update the mute state and let the regular playback flow continue
    
    // When muting, stop any ongoing speech
    if (mute) {
      stopSpeaking();
      setIsSoundPlaying(false);
    }
  }, [mute, stopSpeaking, setIsSoundPlaying]);
};
