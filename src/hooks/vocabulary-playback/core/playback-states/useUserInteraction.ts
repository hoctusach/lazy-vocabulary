
import { useEffect, useRef } from 'react';

/**
 * Hook for managing user interaction detection
 */
export const useUserInteraction = (onUserInteraction?: () => void) => {
  // Track if user has interacted with the page
  const userInteractionRef = useRef<boolean>(false);
  
  // Set up interaction tracking
  useEffect(() => {
    // Try to load from localStorage
    if (localStorage.getItem('speechUnlocked') === 'true') {
      console.log('User interaction detected from localStorage');
      userInteractionRef.current = true;
      onUserInteraction?.();
    }
    
    // Function to handle user interaction
    const handleUserInteraction = () => {
      if (!userInteractionRef.current) {
        console.log('User interaction detected');
        userInteractionRef.current = true;
        onUserInteraction?.();
        localStorage.setItem('speechUnlocked', 'true');
        
        // Try to initialize speech synthesis
        try {
          const silentUtterance = new SpeechSynthesisUtterance(' '); // Just a space
          silentUtterance.volume = 0.01; // Nearly silent
          window.speechSynthesis.speak(silentUtterance);
        } catch (e) {
          console.warn('Silent utterance initialization failed:', e);
        }
        
        // Remove event listeners
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      }
    };
    
    // Add event listeners
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    return () => {
      // Clean up event listeners
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);
  
  return { userInteractionRef };
};
