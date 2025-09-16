
import { useState, useCallback, useEffect } from 'react';
import { saveLocalPreferences } from '@/lib/preferences/localPreferences';

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

    saveLocalPreferences({ is_muted: !mute }).catch(err =>
      console.error('Error saving mute state', err),
    );
  }, [mute, handleToggleMute]);

  return { mute, toggleMute };
};
