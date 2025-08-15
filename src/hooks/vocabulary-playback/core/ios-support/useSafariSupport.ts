import * as React from 'react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { getSpeechRate } from '@/utils/speech/core/speechSettings';

/**
 * Hook to handle Safari and iOS-specific initialization
 */
export const useSafariSupport = (userInteractionRef: React.MutableRefObject<boolean>) => {
  // Special iOS and Safari initialization
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (!isIOS && !isSafari) {
      return;
    }

    const preloadSpeech = () => {
      if ('speechSynthesis' in window) {
        try {
          const utterance = new SpeechSynthesisUtterance(' ');
          utterance.volume = 0.01;
          utterance.rate = getSpeechRate();
          utterance.pitch = 1;

          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
          }
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn('Speech preload failed:', e);
        }
      }
    };

    const enableOnGesture = () => {
      preloadSpeech();
      userInteractionRef.current = true;
      try {
        localStorage.setItem('speechUnlocked', 'true');
      } catch (err) {
        console.warn('Failed to persist interaction state:', err);
      }
      document.removeEventListener('click', enableOnGesture);
      document.removeEventListener('touchstart', enableOnGesture);
      document.removeEventListener('keydown', enableOnGesture);
    };

    const addGestureListeners = () => {
      document.addEventListener('click', enableOnGesture);
      document.addEventListener('touchstart', enableOnGesture);
      document.addEventListener('keydown', enableOnGesture);
    };

    const startUnlockFlow = () => {
      addGestureListeners();
    };

    if (userInteractionRef.current) {
      preloadSpeech();
    } else {
      startUnlockFlow();
    }

    const handleBlocked = () => {
      userInteractionRef.current = false;
      startUnlockFlow();
    };

    window.addEventListener('speechblocked', handleBlocked);

    return () => {
      document.removeEventListener('click', enableOnGesture);
      document.removeEventListener('touchstart', enableOnGesture);
      document.removeEventListener('keydown', enableOnGesture);
      window.removeEventListener('speechblocked', handleBlocked);
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [userInteractionRef.current]);
};
