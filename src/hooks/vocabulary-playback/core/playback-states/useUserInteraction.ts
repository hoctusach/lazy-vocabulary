
import { useEffect, useRef } from 'react';

/**
 * Hook for managing user interaction detection
 */
export const useUserInteraction = () => {
  // Track if user has interacted with the page
  const userInteractionRef = useRef<boolean>(true);
  
  // Set up interaction tracking
  useEffect(() => {
    userInteractionRef.current = true;
  }, []);
  
  return { userInteractionRef };
};
