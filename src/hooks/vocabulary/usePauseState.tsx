
import { useState, useEffect } from 'react';
import { BUTTON_STATES_KEY } from '@/utils/storageKeys';

export const usePauseState = () => {
  const getInitialPausedState = () => {
    try {
      const storedStates = localStorage.getItem(BUTTON_STATES_KEY);
      if (storedStates) {
        const parsedStates = JSON.parse(storedStates);
        return parsedStates.isPaused === true;
      }
    } catch (error) {
      console.error('Error reading button states from localStorage:', error);
    }
    return false;
  };

  const [isPaused, setIsPaused] = useState(getInitialPausedState());

  useEffect(() => {
    try {
      const storedStates = localStorage.getItem(BUTTON_STATES_KEY);
      const parsedStates = storedStates ? JSON.parse(storedStates) : {};
      parsedStates.isPaused = isPaused;
      localStorage.setItem(BUTTON_STATES_KEY, JSON.stringify(parsedStates));
    } catch (error) {
      console.error('Error saving pause state to localStorage:', error);
    }
  }, [isPaused]);

  return { isPaused, setIsPaused };
};
