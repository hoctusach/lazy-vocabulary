
import { useState, useCallback, useEffect } from 'react';
import { useVoiceManager } from '@/hooks/useVoiceManager';
import { useVoiceSettings } from './useVoiceSettings';
import { useChunkManager } from './useChunkManager';
import { useSpeechError } from './useSpeechError';
import { useSpeechState } from './useSpeechState';
import { useSequentialSpeech } from './useSequentialSpeech';
import { toast } from 'sonner';

export const useSpeechSynthesis = () => {
  const { isVoicesLoaded, selectVoiceByRegion } = useVoiceManager();
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
    handleSpeechPermissionError,
    retrySpeechInitialization,
    handleSpeechError,
    retryAttemptsRef
  } = useSpeechError();
  
  const {
    isSpeakingRef,
    speakingLockRef,
    activeUtterancesRef,
    lastSpokenTextRef,
    pauseRequestedRef,
    stopSpeakingLocal,
    pauseSpeakingLocal,
    resumeSpeakingLocal
  } = useSpeechState();
  
  const { speakChunksSequentially } = useSequentialSpeech();
  
  // Function to speak text, returns a Promise
  const speakText = useCallback((text: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (isMuted || !text) {
        console.log("Speech is muted or text is empty");
        resolve('');
        return;
      }
      
      // If we don't have speech permission, return early
      if (!hasSpeechPermission && retryAttemptsRef.current >= 3) {
        console.log("No speech permission and max retries reached");
        setSpeechError('Audio playback is unavailable. You can still practice silently.');
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
      
      // Check if pause is requested - if so, don't start new speech
      if (pauseRequestedRef.current) {
        console.log("Pause requested, not starting new speech");
        resolve('');
        return;
      }
      
      // Set lock to prevent overlapping speech
      speakingLockRef.current = true;
      
      // Stop any currently playing speech
      stopSpeakingLocal();
      
      try {
        setLastSpokenText(text);
        lastSpokenTextRef.current = text;
        
        // Get the selected voice based on region
        const voice = selectVoiceByRegion(voiceRegion);
        
        if (!voice) {
          console.warn(`No ${voiceRegion} voice available, using default fallback`);
        }
        
        // Split text into smaller chunks
        const textChunks = splitTextIntoChunks(text);
        console.log(`Split text into ${textChunks.length} chunks`);
        updateRemainingChunks([...textChunks]);
        
        // Set speaking flag
        isSpeakingRef.current = true;
        
        // Make sure UI gets updated with new text before speaking
        setTimeout(() => {
          speakChunksSequentially(textChunks, voice, 0, pauseRequestedRef)
            .then((result) => {
              console.log('All chunks speech synthesis completed:', result);
              retryAttemptsRef.current = 0; // Reset retry counter on success
              setSpeechError(null); // Clear any error state
              
              setTimeout(() => {
                isSpeakingRef.current = false;
                speakingLockRef.current = false;
                resolve(result);
              }, 100);
            })
            .catch((error) => {
              console.error("Error in speech synthesis:", error);
              const isFatalError = handleSpeechError(error);
              
              isSpeakingRef.current = false;
              speakingLockRef.current = false;
              
              if (isFatalError) {
                reject(error);
              } else {
                // Non-fatal error, treat as partial success
                resolve('partial');
              }
            });
          
          console.log(`Generated speech for: "${text.substring(0, 20)}..."`);
        }, 150);
      } catch (error) {
        console.error("Error in speech synthesis setup:", error);
        handleSpeechError(error);
        isSpeakingRef.current = false;
        speakingLockRef.current = false;
        reject(error);
      }
    });
  }, [
    isMuted, 
    selectVoiceByRegion, 
    voiceRegion, 
    stopSpeakingLocal, 
    hasSpeechPermission, 
    handleSpeechError,
    splitTextIntoChunks, 
    updateRemainingChunks,
    speakChunksSequentially,
    setSpeechError,
    retryAttemptsRef,
    pauseRequestedRef
  ]);
  
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
