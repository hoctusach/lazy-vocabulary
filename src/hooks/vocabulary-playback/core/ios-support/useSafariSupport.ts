import * as React from 'react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { DEFAULT_SPEECH_RATE } from '@/services/speech/core/constants';

/**
 * Hook to handle Safari and iOS-specific initialization
 */
export const useSafariSupport = (userInteractionRef: React.MutableRefObject<boolean>) => {
  // Special iOS and Safari initialization
  useEffect(() => {
    const audioRef = { current: null as AudioContext | null };

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isIOS || isSafari) {
      if (!userInteractionRef.current) {
        toast.error("Please tap anywhere to enable audio playback", { duration: 5000 });
      }
    }

    const handleFirstClick = () => {
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
        console.warn('Speech preload failed:', e);
      }
    };

    document.addEventListener('click', handleFirstClick, { once: true });
    document.addEventListener('touchstart', handleFirstClick, { once: true });

    return () => {
      document.removeEventListener('click', handleFirstClick);
      document.removeEventListener('touchstart', handleFirstClick);
    };
  }, [userInteractionRef]);
};
