
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useVoiceManager } from './useVoiceManager';
import { initializeSpeechSynthesis, createUtterance, cancelSpeech } from '@/utils/speechUtils';

export const useSpeechSynthesis = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  const speakingRef = useRef(false);
  const { toast } = useToast();
  
  const { isVoicesLoaded, availableVoices, selectVoiceByRegion } = useVoiceManager();

  // Firefox needs this workaround to ensure speech works
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && window.speechSynthesis) {
        cancelSpeech();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const speakText = useCallback((text: string): Promise<void> => {
    if (isMuted || !text || speakingRef.current) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const synth = initializeSpeechSynthesis();
      
      // Reset any ongoing speech
      cancelSpeech();
      
      // Avoid concurrent speech
      speakingRef.current = true;
      
      const voice = selectVoiceByRegion(voiceRegion, availableVoices);
      const utterance = createUtterance(text, voice);
      
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
  }, [isMuted, voiceRegion, availableVoices, selectVoiceByRegion]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev;
      if (newValue) {
        cancelSpeech();
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
