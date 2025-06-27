import * as React from 'react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { DEFAULT_SPEECH_RATE } from '@/services/speech/core/constants';

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
          utterance.rate = DEFAULT_SPEECH_RATE;
          utterance.pitch = 1;

          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn('Speech preload failed:', e);
        }
      }
    };

    const enableOnGesture = () => {
      preloadSpeech();
      document.removeEventListener('click', enableOnGesture);
      document.removeEventListener('touchstart', enableOnGesture);
      document.removeEventListener('keydown', enableOnGesture);
    };

    if (userInteractionRef.current) {
      preloadSpeech();
    } else {
      toast.error('Please tap anywhere to enable audio playback', { duration: 5000 });
      document.addEventListener('click', enableOnGesture);
      document.addEventListener('touchstart', enableOnGesture);
      document.addEventListener('keydown', enableOnGesture);
    }

    return () => {
      document.removeEventListener('click', enableOnGesture);
      document.removeEventListener('touchstart', enableOnGesture);
      document.removeEventListener('keydown', enableOnGesture);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [userInteractionRef]);
};
