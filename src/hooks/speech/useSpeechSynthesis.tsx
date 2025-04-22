import { useState, useRef, useCallback } from 'react';
import { useVoiceManager } from '@/hooks/useVoiceManager';
import { useVoiceSettings } from './useVoiceSettings';
import { synthesizeAudio } from '@/utils/speech';

export const useSpeechSynthesis = () => {
  const { isVoicesLoaded, selectVoiceByRegion } = useVoiceManager();
  const { voiceRegion, setVoiceRegion, isMuted, setIsMuted } = useVoiceSettings();
  const [lastSpokenText, setLastSpokenText] = useState('');
  
  // For keeping track of speaking state
  const isSpeakingRef = useRef(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  
  // Function to stop current speech
  const stopSpeaking = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    
    // Also cancel any ongoing speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    isSpeakingRef.current = false;
  }, []);
  
  // Function to speak text, returns a Promise that resolves to an audio URL or empty string
  const speakText = useCallback((text: string): Promise<string> => {
    if (isMuted || !text) {
      console.log("Speech is muted or text is empty");
      return Promise.resolve('');
    }
    
    // Stop any currently playing speech
    stopSpeaking();
    
    try {
      setLastSpokenText(text);
      
      // Get the selected voice based on region
      const voice = selectVoiceByRegion(voiceRegion);
      
      if (!voice) {
        console.warn(`No ${voiceRegion} voice available, using default fallback`);
      }
      
      // Create the audio URL
      const audioUrl = synthesizeAudio(text, voice);
      console.log(`Generated audio for: "${text.substring(0, 20)}..."`);
      
      return Promise.resolve(audioUrl);
    } catch (error) {
      console.error("Error in speech synthesis:", error);
      return Promise.resolve('');
    }
  }, [isMuted, selectVoiceByRegion, voiceRegion, stopSpeaking]);
  
  // Function to toggle mute state
  const handleToggleMute = useCallback(() => {
    stopSpeaking();
    setIsMuted(!isMuted);
    console.log(`Speech ${!isMuted ? 'muted' : 'unmuted'}`);
  }, [isMuted, setIsMuted, stopSpeaking]);
  
  // Function to change voice region
  const handleChangeVoice = useCallback(() => {
    const newRegion = voiceRegion === 'US' ? 'UK' : 'US';
    setVoiceRegion(newRegion);
    console.log(`Voice changed to ${newRegion}`);
  }, [voiceRegion, setVoiceRegion]);
  
  return {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded,
    isSpeakingRef,
    stopSpeaking
  };
};
