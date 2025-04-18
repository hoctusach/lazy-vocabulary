
import { useState, useEffect, useCallback, useRef } from 'react';
import { findFallbackVoice } from '@/utils/speech';

export const useVoiceManager = () => {
  const [isVoicesLoaded, setIsVoicesLoaded] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const loadAttemptsRef = useRef(0);
  const maxLoadAttempts = 10; // Increased max attempts

  const loadVoices = useCallback(() => {
    try {
      const synth = window.speechSynthesis;
      const voices = synth.getVoices();
      
      if (voices.length > 0) {
        console.log("Speech voices loaded:", voices.length);
        setAvailableVoices(voices);
        setIsVoicesLoaded(true);
        loadAttemptsRef.current = 0; // Reset counter on success
      } else {
        loadAttemptsRef.current++;
        console.log(`No voices available yet, attempt ${loadAttemptsRef.current}/${maxLoadAttempts}`);
        
        // Only retry a limited number of times to avoid infinite loops
        if (loadAttemptsRef.current < maxLoadAttempts) {
          setTimeout(loadVoices, 750); // Increased delay between attempts
        } else {
          console.error("Failed to load voices after multiple attempts");
          // Set as loaded anyway to let the app proceed with fallbacks
          setIsVoicesLoaded(true);
        }
      }
    } catch (error) {
      console.error("Error loading voices:", error);
      // Set as loaded anyway to let the app proceed with fallbacks
      setIsVoicesLoaded(true);
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
    if (availableVoices.length === 0) {
      console.log("No voices available, cannot select by region");
      return null;
    }
    
    let voice = null;
    if (voiceRegion === 'US') {
      // Try to find US voice - be more specific to increase chances of success
      voice = availableVoices.find(v => 
        v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Microsoft'))
      );
      
      if (!voice) {
        voice = availableVoices.find(v => v.lang === 'en-US');
      }
    } else {
      // Try to find UK voice - be more specific
      voice = availableVoices.find(v => 
        v.lang === 'en-GB' && (v.name.includes('Google') || v.name.includes('Microsoft'))
      );
      
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
    
    // If still no voice found, try to use the default voice
    if (!voice && availableVoices.length > 0) {
      voice = availableVoices[0];
    }
    
    console.log(`Selected ${voiceRegion} voice:`, voice ? `${voice.name} (${voice.lang})` : "None found");
    return voice;
  }, [availableVoices]);

  return {
    isVoicesLoaded,
    availableVoices,
    selectVoiceByRegion
  };
};
