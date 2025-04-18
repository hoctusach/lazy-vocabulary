
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { speak, stopSpeaking } from '@/utils/speechUtils';

export const useSpeechSynthesis = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  const [isVoicesLoaded, setIsVoicesLoaded] = useState(false);
  const { toast } = useToast();

  // Check if speech synthesis is supported
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Initialize voice loading
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          console.log('Voices loaded successfully:', voices.length);
          setIsVoicesLoaded(true);
        }
      };

      // Load voices initially
      loadVoices();
      
      // Chrome loads voices asynchronously, so add an event listener
      if ('onvoiceschanged' in window.speechSynthesis) {
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      } else {
        // For browsers without the event, try loading after a short delay
        setTimeout(loadVoices, 500);
      }
      
      // Clean up the event listener
      return () => {
        if (window.speechSynthesis && 'onvoiceschanged' in window.speechSynthesis) {
          window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        }
      };
    }
  }, []);

  // Speak function that actually uses the speak utility
  const speakText = useCallback(async (text: string): Promise<void> => {
    if (isMuted || !text) {
      console.log('Speech is muted or no text provided');
      return;
    }

    console.log('Attempting to speak:', text);
    
    try {
      // This is a forced workaround for Chrome's issue where speech synthesis
      // gets paused when tab is not focused
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      
      await speak(text);
    } catch (error) {
      console.error('Failed to speak text:', error);
      toast({
        title: "Speech Error",
        description: "Could not speak the text. Please check your browser's audio settings.",
        variant: "destructive"
      });
    }
  }, [isMuted, toast]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newState = !prev;
      if (newState) {
        stopSpeaking();
      }
      return newState;
    });
  }, []);

  const handleChangeVoice = useCallback(() => {
    setVoiceRegion(prev => (prev === 'US' ? 'UK' : 'US'));
    // When changing voice, we should cancel any ongoing speech
    stopSpeaking();
  }, []);

  return {
    isMuted,
    speakText,
    handleToggleMute,
    voiceRegion,
    handleChangeVoice,
    isVoicesLoaded
  };
};
