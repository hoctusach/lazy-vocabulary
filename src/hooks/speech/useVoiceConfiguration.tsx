
import { useState, useEffect } from 'react';
import { getVoiceByRegion } from '@/utils/speech';

export const useVoiceConfiguration = () => {
  // Try to get the initial voice region from localStorage
  const initialVoiceRegion = (localStorage.getItem('voiceRegion') as 'US' | 'UK') || 'US';
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>(initialVoiceRegion);
  const [isVoicesLoaded, setIsVoicesLoaded] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log('Voices loaded successfully:', voices.length);
        setIsVoicesLoaded(true);
        return true;
      }
      return false;
    };

    // First attempt to load voices
    const voicesLoaded = loadVoices();
    
    if (!voicesLoaded && 'onvoiceschanged' in window.speechSynthesis) {
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
    }

    // For browsers without the event, try loading after delays
    const retryTimes = [500, 1000, 2000, 3000];
    retryTimes.forEach((delay) => {
      setTimeout(() => {
        if (!isVoicesLoaded) {
          loadVoices();
        }
      }, delay);
    });
  }, [isVoicesLoaded]);

  // Save voice region preferences when changed
  useEffect(() => {
    localStorage.setItem('voiceRegion', voiceRegion);
    console.log("Voice region saved to localStorage:", voiceRegion);
  }, [voiceRegion]);

  return {
    voiceRegion,
    setVoiceRegion,
    isVoicesLoaded
  };
};
