
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useSpeechSynthesis = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  const [isVoicesLoaded, setIsVoicesLoaded] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const { toast } = useToast();
  const speakingRef = useRef(false);

  // Initialize speech synthesis and load voices
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
      synth.cancel();
      if ('onvoiceschanged' in synth) {
        synth.removeEventListener('voiceschanged', loadVoices);
      }
    };
  }, []);

  // Firefox needs this workaround to ensure speech works
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Main function to speak text
  const speakText = useCallback((text: string): Promise<void> => {
    if (isMuted || !text || speakingRef.current) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const synth = window.speechSynthesis;
      
      // Reset any ongoing speech
      synth.cancel();
      
      // Avoid concurrent speech
      speakingRef.current = true;
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Select voice based on region preference
      let voice = null;
      if (voiceRegion === 'US') {
        voice = availableVoices.find(v => v.lang === 'en-US');
      } else {
        voice = availableVoices.find(v => v.lang === 'en-GB');
      }
      
      if (!voice) {
        // Fallback to any English voice
        voice = availableVoices.find(v => v.lang.startsWith('en'));
      }
      
      if (voice) {
        utterance.voice = voice;
        utterance.rate = 0.9; // Slightly slower for better clarity
        utterance.pitch = 1.0;
      }
      
      utterance.onend = () => {
        speakingRef.current = false;
        resolve();
      };
      
      utterance.onerror = (event) => {
        console.error("Speech error:", event);
        speakingRef.current = false;
        reject(event);
      };
      
      synth.speak(utterance);
    });
  }, [isMuted, voiceRegion, availableVoices]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev;
      if (newValue) {
        window.speechSynthesis.cancel();
        speakingRef.current = false;
      }
      return newValue;
    });
  }, []);

  const handleChangeVoice = useCallback(() => {
    setVoiceRegion(prev => (prev === 'US' ? 'UK' : 'US'));
  }, []);

  return {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded
  };
};
