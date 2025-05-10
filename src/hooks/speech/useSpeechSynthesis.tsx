
import { useState, useCallback, useEffect } from 'react';
import { useVoiceManager } from '@/hooks/useVoiceManager';
import { useVoiceSettings } from './useVoiceSettings';
import { useChunkManager } from './useChunkManager';
import { useSpeechError } from './useSpeechError';
import { useSpeechState } from './useSpeechState';
import { useSpeechPlayback } from './useSpeechPlayback';
import { stopSpeaking } from '@/utils/speech';

export const useSpeechSynthesis = () => {
  const { isVoicesLoaded } = useVoiceManager();
  const { voiceRegion, setVoiceRegion, isMuted, setIsMuted } = useVoiceSettings();
  const [lastSpokenText, setLastSpokenText] = useState('');
  
  const { 
    splitTextIntoChunks, 
    remainingChunks,
    updateRemainingChunks 
  } = useChunkManager();
  
  const {
    speechError,
    setSpeechError,
    hasSpeechPermission,
    retrySpeechInitialization
  } = useSpeechError();
  
  const {
    isSpeakingRef,
    pauseRequestedRef,
    stopSpeakingLocal,
    pauseSpeakingLocal,
    resumeSpeakingLocal
  } = useSpeechState();

  const { speakText } = useSpeechPlayback();
  
  // Function to toggle mute state
  const handleToggleMute = useCallback(() => {
    stopSpeakingLocal();
    setIsMuted(!isMuted);
    console.log(`Speech ${!isMuted ? 'muted' : 'unmuted'}`);
  }, [isMuted, setIsMuted, stopSpeakingLocal]);
  
  // Function to change voice region
  const handleChangeVoice = useCallback(() => {
    const newRegion = voiceRegion === 'US' ? 'UK' : 'US';
    setVoiceRegion(newRegion);
    console.log(`Voice changed to ${newRegion}`);
  }, [voiceRegion, setVoiceRegion]);
  
  // Clean up speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  return {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded,
    isSpeakingRef,
    stopSpeaking: stopSpeakingLocal,
    pauseSpeaking: pauseSpeakingLocal,
    resumeSpeaking: resumeSpeakingLocal,
    pauseRequestedRef,
    speechError,
    hasSpeechPermission,
    retrySpeechInitialization
  };
};
