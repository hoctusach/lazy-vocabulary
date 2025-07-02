
import { useState, useEffect, useCallback, useRef } from 'react';
import { logAvailableVoices } from '@/utils/speech/debug/logVoices';

export const useVoiceLoading = (voiceRegion: 'US' | 'UK' | 'AU') => {
  const [isVoicesLoaded, setIsVoicesLoaded] = useState(false);
  const voicesLoadedTimeoutRef = useRef<number | null>(null);
  const currentVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const lastVoiceRegionRef = useRef<'US' | 'UK' | 'AU'>(voiceRegion);
  const pendingSpeechRef = useRef<{text: string, forceSpeak: boolean} | null>(null);

  // Initialize voice loading
  const loadVoices = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    logAvailableVoices(voices);
    if (voices.length > 0) {
      console.log('Voices loaded successfully:', voices.length);
      setIsVoicesLoaded(true);
      currentVoiceRef.current = voices[0] || null;
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const supported = 'speechSynthesis' in window;
    if (!supported) {
      console.warn("Your browser doesn't support speech synthesis.");
      return;
    }

    const voicesLoaded = loadVoices();
    
    if (!voicesLoaded) {
      if ('onvoiceschanged' in window.speechSynthesis) {
        const voicesChangedHandler = () => {
          const success = loadVoices();
          if (success) {
            window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
          }
        };
        
        window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
        return () => {
          window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        };
      } else {
        const retryTimes = [300, 600, 900, 1200];
        retryTimes.forEach((delay, index) => {
          voicesLoadedTimeoutRef.current = window.setTimeout(() => {
            const success = loadVoices();
            if (success) {
              console.log(`Voices loaded on attempt ${index + 1}`);
            }
          }, delay);
        });
        
        return () => {
          if (voicesLoadedTimeoutRef.current) {
            clearTimeout(voicesLoadedTimeoutRef.current);
          }
        };
      }
    }
  }, [loadVoices]);

  return {
    isVoicesLoaded,
    currentVoiceRef,
    lastVoiceRegionRef,
    pendingSpeechRef
  };
};
