
import { useState, useEffect } from 'react';
import { getPreferences, savePreferences } from '@/lib/db/preferences';

export const usePauseState = () => {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    getPreferences()
      .then(p => setIsPaused(!p.is_playing))
      .catch(() => {});
  }, []);

  useEffect(() => {
    savePreferences({ is_playing: !isPaused }).catch(err =>
      console.error('Error saving pause state', err),
    );
  }, [isPaused]);

  return { isPaused, setIsPaused };
};
