
import { useState, useEffect } from 'react';

export const usePauseState = () => {
  const getInitialPausedState = () => {
    try {
      const storedStates = localStorage.getItem('buttonStates');
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
      const storedStates = localStorage.getItem('buttonStates');
      const parsedStates = storedStates ? JSON.parse(storedStates) : {};
      parsedStates.isPaused = isPaused;
      localStorage.setItem('buttonStates', JSON.stringify(parsedStates));
    } catch (error) {
      console.error('Error saving pause state to localStorage:', error);
    }
  }, [isPaused]);

  return { isPaused, setIsPaused };
};
