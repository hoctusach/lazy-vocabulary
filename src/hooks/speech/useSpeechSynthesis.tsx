
import { useCallback, useRef } from 'react';
import { speak, stopSpeaking } from '@/utils/speech';
import { useVoiceSettings } from './useVoiceSettings';
import { useVoiceLoading } from './useVoiceLoading';

export const useSpeechSynthesis = () => {
  const { isMuted, voiceRegion, setIsMuted, setVoiceRegion } = useVoiceSettings();
  const { isVoicesLoaded, currentVoiceRef, lastVoiceRegionRef, pendingSpeechRef } = useVoiceLoading(voiceRegion);
  const speakingRef = useRef(false);
  const speechRequestIdRef = useRef(0);
  const currentTextRef = useRef<string | null>(null);

  // Speak function with full promise handling to ensure completion
  const speakText = useCallback(async (text: string): Promise<void> => {
    currentTextRef.current = text;
    
    if (!isVoicesLoaded) {
      console.log('Voices not loaded yet, queueing speech for later');
      pendingSpeechRef.current = { text, forceSpeak: true };
      return Promise.resolve();
    }

    if (isMuted || !text) {
      console.log(isMuted ? 'Speech is muted' : 'No text provided');
      return Promise.resolve();
    }

    if (speakingRef.current) {
      console.log('Already speaking, canceling previous speech');
      stopSpeaking();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const requestId = ++speechRequestIdRef.current;
    speakingRef.current = true;
    
    try {
      await speak(text, voiceRegion);
      if (requestId === speechRequestIdRef.current) {
        console.log('Speech completed successfully');
      }
    } catch (error) {
      console.error('Failed to speak text:', error);
    } finally {
      if (requestId === speechRequestIdRef.current) {
        speakingRef.current = false;
      }
    }
  }, [isMuted, voiceRegion, isVoicesLoaded]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newState = !prev;
      stopSpeaking();
      console.log(`Mute state changed to: ${newState}`);
      return newState;
    });
  }, [setIsMuted]);

  const handleChangeVoice = useCallback(() => {
    setVoiceRegion(prev => {
      const newRegion = prev === 'US' ? 'UK' : 'US';
      console.log(`Changing voice region from ${prev} to ${newRegion}`);
      stopSpeaking();
      return newRegion;
    });
  }, [setVoiceRegion]);

  const getCurrentText = useCallback(() => {
    return currentTextRef.current;
  }, []);

  return {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded,
    speakingRef,
    getCurrentText
  };
};
