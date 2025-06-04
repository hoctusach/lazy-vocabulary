
import { useState } from 'react';

/**
 * Hook for managing playback state including current index and other playback-related state
 */
export const usePlaybackState = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  return {
    currentIndex,
    setCurrentIndex
  };
};
