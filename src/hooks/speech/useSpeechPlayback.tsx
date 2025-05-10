
import { useCallback } from 'react';
import { speak } from '@/utils/speech';
import { useVoiceManager } from '@/hooks/useVoiceManager';
import { useVoiceSettings } from './useVoiceSettings';
import { useSpeechState } from './useSpeechState';
import { useSpeechError } from './useSpeechError';

export const useSpeechPlayback = () => {
  const { isMuted } = useVoiceSettings();
  const { selectVoiceByRegion } = useVoiceManager();
  const {
    isSpeakingRef,
    speakingLockRef,
    lastSpokenTextRef,
    pauseRequestedRef,
    stopSpeakingLocal
  } = useSpeechState();
  
  const {
    speechError,
    setSpeechError,
    hasSpeechPermission,
    handleSpeechError,
    retryAttemptsRef
  } = useSpeechError();

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
        lastSpokenTextRef.current = text;
        
        // Make sure UI gets updated with new text before speaking
        setTimeout(() => {
          const voiceRegion = localStorage.getItem('buttonStates') ? 
            JSON.parse(localStorage.getItem('buttonStates') || '{}').voiceRegion || 'US' : 
            'US';

          speak(text, voiceRegion, pauseRequestedRef)
            .then((result) => {
              console.log('Speech synthesis completed:', result);
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
    stopSpeakingLocal, 
    hasSpeechPermission, 
    handleSpeechError,
    setSpeechError,
    retryAttemptsRef,
    pauseRequestedRef,
    isSpeakingRef,
    speakingLockRef,
    lastSpokenTextRef
  ]);

  return {
    speakText
  };
};
