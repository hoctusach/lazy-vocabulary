
import { useState, useRef, useEffect } from 'react';
import { toast } from "sonner";

/**
 * Core playback state and utility functions
 */
export const useCorePlayback = (onUserInteraction?: () => void) => {
  // Basic state for playback
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingRef = useRef(false);
  const retryAttemptsRef = useRef(0);
  const maxRetries = 3;
  const userInteractionRef = useRef(false);
  const speechInitializedRef = useRef(false);
  
  // Initialize speech synthesis on mount
  useEffect(() => {
    const audioRef = { current: null as AudioContext | null };

    const initSpeechWithPermission = async () => {
      if (speechInitializedRef.current) return;

      try {
        window.speechSynthesis.getVoices();
        const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtor) {
          if (!audioRef.current) {
            audioRef.current = new AudioCtor();
          }
          if (audioRef.current.state === 'suspended') {
            await audioRef.current.resume().catch(() => {});
          }
        }
        speechInitializedRef.current = true;
      } catch (err) {
        console.error('Error initializing speech:', err);
      }
    };

    const detectUserInteraction = () => {
      if (!userInteractionRef.current) {
        console.log('User interaction detected in useCorePlayback');
        userInteractionRef.current = true;
        onUserInteraction?.();

        if (!speechInitializedRef.current) {
          void initSpeechWithPermission();
        }
      }
    };
    
    // Listen for user interaction
    document.addEventListener('click', detectUserInteraction);
    document.addEventListener('touchstart', detectUserInteraction);
    

    
    return () => {
      document.removeEventListener('click', detectUserInteraction);
      document.removeEventListener('touchstart', detectUserInteraction);
    };
  }, []);

  // Function to check browser speech support
  const checkSpeechSupport = (): boolean => {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported in this browser');
      toast.error("Speech synthesis isn't supported in your browser");
      return false;
    }
    return true;
  };
  
  // Reset retry attempts counter
  const resetRetryAttempts = () => {
    retryAttemptsRef.current = 0;
  };

  // Increment retry counter
  const incrementRetryAttempts = (): boolean => {
    retryAttemptsRef.current++;
    return retryAttemptsRef.current <= maxRetries;
  };
  
  return {
    isSpeaking,
    setIsSpeaking,
    speakingRef,
    retryAttemptsRef,
    maxRetries,
    userInteractionRef,
    checkSpeechSupport,
    resetRetryAttempts,
    incrementRetryAttempts,
    speechInitializedRef
  };
};
