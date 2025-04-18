
import { useState, useEffect, useCallback } from 'react';
import { findFallbackVoice } from '@/utils/speechUtils';

export const useVoiceManager = () => {
  const [isVoicesLoaded, setIsVoicesLoaded] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const loadVoices = useCallback(() => {
    try {
      const synth = window.speechSynthesis;
      const voices = synth.getVoices();
      
      if (voices.length > 0) {
        console.log("Speech voices loaded:", voices.length);
        setAvailableVoices(voices);
        setIsVoicesLoaded(true);
      } else {
        console.log("No voices available yet, will retry");
        // Some browsers need a manual retry
        setTimeout(loadVoices, 500);
      }
    } catch (error) {
      console.error("Error loading voices:", error);
    }
  }, []);
  
  useEffect(() => {
    const synth = window.speechSynthesis;
    
    // Initial load attempt
    loadVoices();
    
    // Chrome loads voices asynchronously
    if ('onvoiceschanged' in synth) {
      synth.addEventListener('voiceschanged', loadVoices);
    } else {
      // For browsers without the event, try checking again after a short delay
      const retryTimer = setTimeout(loadVoices, 1000);
      return () => clearTimeout(retryTimer);
    }
    
    return () => {
      if ('onvoiceschanged' in synth) {
        synth.removeEventListener('voiceschanged', loadVoices);
      }
    };
  }, [loadVoices]);

  const selectVoiceByRegion = useCallback((voiceRegion: 'US' | 'UK'): SpeechSynthesisVoice | null => {
    if (!isVoicesLoaded || availableVoices.length === 0) {
      console.log("Voices not loaded yet, cannot select by region");
      return null;
    }
    
    let voice = null;
    if (voiceRegion === 'US') {
      // Try to find US voice - be more specific to increase chances of success
      voice = availableVoices.find(v => v.lang === 'en-US' && v.name.includes('Google'));
      
      if (!voice) {
        voice = availableVoices.find(v => v.lang === 'en-US');
      }
    } else {
      // Try to find UK voice - be more specific
      voice = availableVoices.find(v => v.lang === 'en-GB' && v.name.includes('Google'));
      
      if (!voice) {
        voice = availableVoices.find(v => v.lang === 'en-GB');
      }
    }
    
    if (!voice) {
      // Fallback to any English voice
      voice = availableVoices.find(v => v.lang.startsWith('en')) || null;
    }
    
    if (!voice) {
      // Last resort - use fallback voice finder
      voice = findFallbackVoice(availableVoices);
    }
    
    return voice;
  }, [isVoicesLoaded, availableVoices]);

  return {
    isVoicesLoaded,
    availableVoices,
    selectVoiceByRegion
  };
};
