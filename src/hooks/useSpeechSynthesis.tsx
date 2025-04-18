
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useSpeechSynthesis = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  const [isVoicesLoaded, setIsVoicesLoaded] = useState(false);
  const { toast } = useToast();

  // Initialize speech synthesis and load voices
  useEffect(() => {
    const synth = window.speechSynthesis;
    
    const loadVoices = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        console.log("Speech voices loaded:", voices.length);
        setIsVoicesLoaded(true);
        
        toast({
          title: "Speech Ready",
          description: "Using browser's text-to-speech",
        });
      }
    };

    loadVoices();
    
    // Chrome loads voices asynchronously
    if ('onvoiceschanged' in synth) {
      synth.onvoiceschanged = loadVoices;
    }
    
    return () => {
      synth.cancel();
    };
  }, [toast]);

  const speakText = useCallback((text: string): Promise<void> => {
    if (isMuted || !text) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const synth = window.speechSynthesis;
      synth.cancel(); // Cancel any ongoing speech
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Select voice based on region preference
      const voices = synth.getVoices();
      const preferredVoice = voices.find(voice => {
        if (voiceRegion === 'US') {
          return voice.lang.includes('en-US');
        } else {
          return voice.lang.includes('en-GB');
        }
      }) || voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.onend = () => {
        console.log("Speech completed:", text.substring(0, 50));
        resolve();
      };
      
      utterance.onerror = (event) => {
        console.error("Speech error:", event);
        toast({
          title: "Speech Error",
          description: "There was an issue with the text-to-speech service.",
          variant: "destructive"
        });
        reject(event);
      };
      
      console.log(`Speaking with ${preferredVoice?.name || 'default voice'}: ${text.substring(0, 50)}...`);
      synth.speak(utterance);
    });
  }, [isMuted, voiceRegion, toast]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev;
      console.log("Mute toggled:", newValue);
      if (newValue) {
        window.speechSynthesis.cancel();
      }
      return newValue;
    });
  }, []);

  const handleChangeVoice = useCallback(() => {
    setVoiceRegion(prev => {
      const newValue = prev === 'US' ? 'UK' : 'US';
      console.log("Voice region changed to:", newValue);
      return newValue;
    });
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
