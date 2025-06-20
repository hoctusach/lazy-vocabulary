
import { useRef } from 'react';

/**
 * Hook for managing the play-in-progress state to prevent overlapping attempts
 */
export const usePlayInProgress = () => {
  const playInProgressRef = useRef(false);
  
  const setPlayInProgress = (inProgress: boolean) => {
    playInProgressRef.current = inProgress;
  };
  
  const isPlayInProgress = () => playInProgressRef.current;
  
  return {
    playInProgressRef,
    setPlayInProgress,
    isPlayInProgress
  };
};
