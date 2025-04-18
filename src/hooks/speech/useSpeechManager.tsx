
import { useRef, useCallback, useEffect } from 'react';
import { speak, stopSpeaking } from '@/utils/speech';
import { useVoiceConfiguration } from './useVoiceConfiguration';
import { useSpeechState } from './useSpeechState';

export const useSpeechManager = () => {
  console.log("Initializing speech manager");
  const { voiceRegion, setVoiceRegion, isVoicesLoaded } = useVoiceConfiguration();
  const { isMuted, handleToggleMute } = useSpeechState();
  
  const speakingRef = useRef(false);
  const currentTextRef = useRef<string | null>(null);
  const lastSpeakTimeRef = useRef<number>(0);

  // Add logging for initial state
  useEffect(() => {
    console.log("Speech manager initialized with voice region:", voiceRegion, "muted:", isMuted);
  }, [voiceRegion, isMuted]);
  
  // Log whenever voices are loaded
  useEffect(() => {
    if (isVoicesLoaded) {
      console.log("Voice system is now ready with region:", voiceRegion);
    }
  }, [isVoicesLoaded, voiceRegion]);

  const speakText = useCallback(async (text: string): Promise<void> => {
    try {
      // Track start time of speaking request
      const requestTime = Date.now();
      lastSpeakTimeRef.current = requestTime;
      currentTextRef.current = text;
      
      if (isMuted || !text) {
        console.log(isMuted ? 'Speech is muted, not speaking' : 'No text provided for speech');
        return Promise.resolve();
      }

      if (speakingRef.current) {
        console.log('Already speaking, canceling previous speech');
        stopSpeaking();
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Only proceed if this is still the most recent speak request
      if (requestTime !== lastSpeakTimeRef.current) {
        console.log('Newer speak request received, abandoning this one');
        return Promise.resolve();
      }

      speakingRef.current = true;
      console.log('Speaking text:', text.substring(0, 30) + '...', 'with voice region:', voiceRegion);
      
      await speak(text, voiceRegion);
      console.log('Speech completed successfully for:', text.substring(0, 20) + '...');
    } catch (error) {
      console.error('Failed to speak text:', error);
      // Reset speaking state on error
      speakingRef.current = false;
    } finally {
      // Only reset the speaking state if this is the most recent request
      if (lastSpeakTimeRef.current === Date.now()) {
        speakingRef.current = false;
      }
    }
  }, [isMuted, voiceRegion]);

  const handleChangeVoice = useCallback(() => {
    console.log("Changing voice region...");
    stopSpeaking();
    setVoiceRegion(prev => {
      const newRegion = prev === 'US' ? 'UK' : 'US';
      console.log(`Voice region changed from ${prev} to ${newRegion}`);
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
