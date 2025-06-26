
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
    if (localStorage.getItem('hadUserInteraction') === 'true') {
      console.log('User interaction detected from localStorage');
      userInteractionRef.current = true;
      onUserInteraction?.();
    }
    
    // Function to handle user interaction
    const audioRef = { current: null as AudioContext | null };
    const handleUserInteraction = () => {
      if (!userInteractionRef.current) {
        console.log('User interaction detected');
        userInteractionRef.current = true;
        onUserInteraction?.();
        localStorage.setItem('hadUserInteraction', 'true');

        try {
          window.speechSynthesis.getVoices();
          const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtor) {
            if (!audioRef.current) {
              audioRef.current = new AudioCtor();
            }
            if (audioRef.current.state === 'suspended') {
              audioRef.current.resume().catch(() => {});
            }
          }
        } catch (e) {
          console.warn('Voice preload failed:', e);
        }

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
