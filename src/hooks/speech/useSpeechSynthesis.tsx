import { useState, useRef, useCallback, useEffect } from 'react';
import { useVoiceManager } from '@/hooks/useVoiceManager';
import { useVoiceSettings } from './useVoiceSettings';
import { synthesizeAudio } from '@/utils/speech/synthesisUtils';
import { stopSpeaking } from '@/utils/speech';

export const useSpeechSynthesis = () => {
  const { isVoicesLoaded, selectVoiceByRegion } = useVoiceManager();
  const { voiceRegion, setVoiceRegion, isMuted, setIsMuted } = useVoiceSettings();
  const [lastSpokenText, setLastSpokenText] = useState('');
  
  // For keeping track of speaking state
  const isSpeakingRef = useRef(false);
  const speakingLockRef = useRef(false);
  
  // Function to stop current speech
  const stopSpeakingLocal = useCallback(() => {
    // Cancel any ongoing speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    isSpeakingRef.current = false;
    speakingLockRef.current = false;
    console.log('Speech stopped');
  }, []);
  
  // Function to speak text, returns a Promise
  const speakText = useCallback((text: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (isMuted || !text) {
        console.log("Speech is muted or text is empty");
        resolve('');
        return;
      }
      
      // If we're already speaking and locked, queue this speak request
      if (speakingLockRef.current) {
        console.log("Speech already in progress, queuing request");
        // Resolve after a delay to allow current speech to finish
        setTimeout(() => {
          if (!isMuted) {
            speakText(text).then(resolve).catch(reject);
          } else {
            resolve('');
          }
        }, 800);
        return;
      }
      
      // Set lock to prevent overlapping speech
      speakingLockRef.current = true;
      
      // Stop any currently playing speech
      stopSpeakingLocal();
      
      try {
        setLastSpokenText(text);
        
        // Get the selected voice based on region
        const voice = selectVoiceByRegion(voiceRegion);
        
        if (!voice) {
          console.warn(`No ${voiceRegion} voice available, using default fallback`);
        }
        
        // Set speaking flag
        isSpeakingRef.current = true;
        
        // Make sure UI gets updated with new text before speaking
        setTimeout(() => {
          // Create the audio using Web Speech API
          synthesizeAudio(text, voice)
            .then((result) => {
              console.log('Speech synthesis completed:', result);
              setTimeout(() => {
                isSpeakingRef.current = false;
                speakingLockRef.current = false;
                resolve(result);
              }, 100);
            })
            .catch((error) => {
              console.error("Error in speech synthesis:", error);
              isSpeakingRef.current = false;
              speakingLockRef.current = false;
              reject(error);
            });
          
          console.log(`Generated speech for: "${text.substring(0, 20)}..."`);
        }, 150);
      } catch (error) {
        console.error("Error in speech synthesis:", error);
        isSpeakingRef.current = false;
        speakingLockRef.current = false;
        reject(error);
      }
    });
  }, [isMuted, selectVoiceByRegion, voiceRegion, stopSpeakingLocal]);
  
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
    stopSpeaking: stopSpeakingLocal
  };
};
