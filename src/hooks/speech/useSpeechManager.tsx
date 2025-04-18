
import { useRef, useCallback } from 'react';
import { speak, stopSpeaking } from '@/utils/speech';
import { useVoiceConfiguration } from './useVoiceConfiguration';
import { useSpeechState } from './useSpeechState';

export const useSpeechManager = () => {
  const { voiceRegion, setVoiceRegion, isVoicesLoaded } = useVoiceConfiguration();
  const { isMuted, handleToggleMute } = useSpeechState();
  
  const speakingRef = useRef(false);
  const currentTextRef = useRef<string | null>(null);

  const speakText = useCallback(async (text: string): Promise<void> => {
    currentTextRef.current = text;
    
    if (isMuted || !text) {
      console.log(isMuted ? 'Speech is muted' : 'No text provided');
      return Promise.resolve();
    }

    if (speakingRef.current) {
      console.log('Already speaking, canceling previous speech');
      stopSpeaking();
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    speakingRef.current = true;
    console.log('Attempting to speak:', text.substring(0, 30) + '...', 'with voice region:', voiceRegion);
    
    try {
      await speak(text, voiceRegion);
      console.log('Speech completed successfully');
    } catch (error) {
      console.error('Failed to speak text:', error);
    } finally {
      speakingRef.current = false;
    }
  }, [isMuted, voiceRegion]);

  const handleChangeVoice = useCallback(() => {
    stopSpeaking();
    setVoiceRegion(prev => prev === 'US' ? 'UK' : 'US');
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
