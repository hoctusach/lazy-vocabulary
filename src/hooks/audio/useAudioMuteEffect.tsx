
import { useEffect } from 'react';
import { BUTTON_STATES_KEY } from '@/utils/storageKeys';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

export const useAudioMuteEffect = (mute: boolean) => {
  // Effect specifically for mute changes
  useEffect(() => {
    // Store mute state in localStorage
    try {
      const buttonStates = JSON.parse(
        localStorage.getItem(BUTTON_STATES_KEY) || '{}'
      );
      buttonStates.isMuted = mute;
      localStorage.setItem(BUTTON_STATES_KEY, JSON.stringify(buttonStates));
    } catch (e) {
      // Ignore localStorage errors
    }

    unifiedSpeechController.setMuted(mute);
  }, [mute]);
};
