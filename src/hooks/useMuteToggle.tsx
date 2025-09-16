import { useState, useCallback, useEffect } from 'react';
import { getIsMuted, setIsMuted } from '@/utils/localPreferences';

export const useMuteToggle = (
  isMuted: boolean,
  handleToggleMute: () => void
) => {
  const [mute, setMute] = useState(() => getIsMuted());

  // Sync with parent mute state
  useEffect(() => {
    setMute(isMuted);
    setIsMuted(isMuted);
  }, [isMuted]);

  // Toggle mute without restarting speech or clearing timers
  const toggleMute = useCallback(() => {
    console.log('[APP] Toggling mute state from', mute, 'to', !mute);
    setMute(!mute);
    handleToggleMute();

    setIsMuted(!mute);
  }, [mute, handleToggleMute]);

  return { mute, toggleMute };
};
