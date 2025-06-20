
import { useCallback, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Hook for loading and managing speech synthesis voices
 */
export const useVoiceLoader = () => {
  // Track if voices have been loaded
  const voicesLoadedRef = useRef<boolean>(false);
  
  // Ensure voices are loaded before attempting speech
  const ensureVoicesLoaded = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      // If voices are already loaded, resolve immediately
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        voicesLoadedRef.current = true;
        console.log(`Voices already loaded: ${voices.length} voices available`);
        resolve(true);
        return;
      }
      
      // Set up event listener for voices changed
      const voiceChangedHandler = () => {
        const newVoices = window.speechSynthesis.getVoices();
        if (newVoices.length > 0) {
          console.log(`Voices loaded via event: ${newVoices.length} voices`);
          voicesLoadedRef.current = true;
          window.speechSynthesis.removeEventListener('voiceschanged', voiceChangedHandler);
          resolve(true);
        }
      };
      
      // Listen for voices changed event
      window.speechSynthesis.addEventListener('voiceschanged', voiceChangedHandler);
      
      // Fallback timeout - try to get voices directly after a delay
      setTimeout(() => {
        const fallbackVoices = window.speechSynthesis.getVoices();
        if (fallbackVoices.length > 0 && !voicesLoadedRef.current) {
          console.log(`Fallback voices loaded: ${fallbackVoices.length} voices`);
          voicesLoadedRef.current = true;
          window.speechSynthesis.removeEventListener('voiceschanged', voiceChangedHandler);
          resolve(true);
        } else if (!voicesLoadedRef.current) {
          console.warn('No voices available after timeout, continuing anyway');
          window.speechSynthesis.removeEventListener('voiceschanged', voiceChangedHandler);
          resolve(false);
        }
      }, 2000);
    });
  }, []);

  return {
    voicesLoadedRef,
    ensureVoicesLoaded
  };
};
