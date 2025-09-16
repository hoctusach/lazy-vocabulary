
import { useState, useEffect } from 'react';
import {
  getLocalPreferences,
  saveLocalPreferences,
} from '@/lib/preferences/localPreferences';

export const usePauseState = () => {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    getLocalPreferences()
      .then(p => setIsPaused(!p.is_playing))
      .catch(() => {});
  }, []);

  useEffect(() => {
    saveLocalPreferences({ is_playing: !isPaused }).catch(err =>
      console.error('Error saving pause state', err),
    );
  }, [isPaused]);

  return { isPaused, setIsPaused };
};
