
import { useState, useEffect } from 'react';

export const useVoiceManager = () => {
  const [isVoicesLoaded, setIsVoicesLoaded] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const synth = window.speechSynthesis;
    
    const loadVoices = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        console.log("Speech voices loaded:", voices.length);
        setAvailableVoices(voices);
        setIsVoicesLoaded(true);
      }
    };

    // Initial load attempt
    loadVoices();
    
    // Chrome loads voices asynchronously
    if ('onvoiceschanged' in synth) {
      synth.addEventListener('voiceschanged', loadVoices);
    }
    
    return () => {
      if ('onvoiceschanged' in synth) {
        synth.removeEventListener('voiceschanged', loadVoices);
      }
    };
  }, []);

  const selectVoiceByRegion = (voiceRegion: 'US' | 'UK', voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    let voice = null;
    if (voiceRegion === 'US') {
      voice = voices.find(v => v.lang === 'en-US');
    } else {
      voice = voices.find(v => v.lang === 'en-GB');
    }
    
    if (!voice) {
      // Fallback to any English voice
      voice = voices.find(v => v.lang.startsWith('en')) || null;
    }
    
    return voice;
  };

  return {
    isVoicesLoaded,
    availableVoices,
    selectVoiceByRegion
  };
};
