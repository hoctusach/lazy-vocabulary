import * as React from 'react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Hook to handle Safari and iOS-specific initialization
 */
export const useSafariSupport = (userInteractionRef: React.MutableRefObject<boolean>) => {
  // Special iOS and Safari initialization
  useEffect(() => {
    // iOS needs user interaction to enable audio
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isIOS || isSafari) {
      if (!userInteractionRef.current) {
        toast.error("Please tap anywhere to enable audio playback", { duration: 5000 });
      }
    }
    
    // Try to force browser to preload speech synthesis
    const preloadSpeech = () => {
      if ('speechSynthesis' in window) {
        try {
          // Create a minimal utterance - just a space
          const utterance = new SpeechSynthesisUtterance(' ');
          utterance.volume = 0.01;
          utterance.rate = 1;
          utterance.pitch = 1;
          
          // Try to speak it
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn('Speech preload failed:', e);
        }
      }
    };
    
    // Try preloading once on mount
    preloadSpeech();
    
    // Clean up
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [userInteractionRef]);
};
