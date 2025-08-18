
import { useState, useCallback, useEffect } from 'react';
import { BUTTON_STATES_KEY } from '@/utils/storageKeys';

export const useMuteToggle = (
  isMuted: boolean,
  handleToggleMute: () => void
) => {
  const [mute, setMute] = useState(isMuted);

  // Sync with parent mute state
  useEffect(() => {
    setMute(isMuted);
  }, [isMuted]);

  // Toggle mute without restarting speech or clearing timers
  const toggleMute = useCallback(() => {
    console.log('[APP] Toggling mute state from', mute, 'to', !mute);
    setMute(!mute);
    handleToggleMute();

    // Just update the muted state in localStorage
    try {
      const buttonStates = JSON.parse(
        localStorage.getItem(BUTTON_STATES_KEY) || '{}'
      );
      buttonStates.isMuted = !mute;
      localStorage.setItem(BUTTON_STATES_KEY, JSON.stringify(buttonStates));
    } catch (error) {
      console.error('Error updating mute state in localStorage:', error);
    }
  }, [mute, handleToggleMute]);

  return { mute, toggleMute };
};
