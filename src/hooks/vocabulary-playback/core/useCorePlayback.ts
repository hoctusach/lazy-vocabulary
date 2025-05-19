
import { useState, useRef, useEffect } from 'react';
import { toast } from "sonner";

/**
 * Core playback state and utility functions
 */
export const useCorePlayback = () => {
  // Basic state for playback
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingRef = useRef(false);
  const retryAttemptsRef = useRef(0);
  const maxRetries = 3;
  const userInteractionRef = useRef(false);
  const speechInitializedRef = useRef(false);
  
  // Initialize speech synthesis on mount
  useEffect(() => {
    // Create our own user interaction detection
    const detectUserInteraction = (e: MouseEvent | TouchEvent) => {
      if (!userInteractionRef.current) {
        console.log('User interaction detected in useCorePlayback');
        userInteractionRef.current = true;
        
        // Initialize speech synthesis after user interaction
        if (!speechInitializedRef.current) {
          initSpeechWithPermission();
        }
      }
    };
    
    // Try to initialize speech synthesis
    const initSpeechWithPermission = () => {
      if (speechInitializedRef.current) return;
      
      try {
        console.log('Initializing speech synthesis after user interaction');
        // Create a silent utterance to initialize speech system
        const silentUtterance = new SpeechSynthesisUtterance(' ');
        silentUtterance.volume = 0; // Silent
        silentUtterance.rate = 1;
        
        silentUtterance.onend = () => {
          console.log("Speech initialization completed");
          speechInitializedRef.current = true;
        };
        
        silentUtterance.onerror = (e) => {
          console.log("Speech initialization error", e);
          // Still mark as initialized to avoid infinite retries
          speechInitializedRef.current = true;
        };
        
        // Try to speak the silent utterance
        window.speechSynthesis.cancel(); // Clear any pending speech
        window.speechSynthesis.speak(silentUtterance);
      } catch (err) {
        console.error('Error initializing speech:', err);
      }
    };
    
    // Listen for user interaction
    document.addEventListener('click', detectUserInteraction);
    document.addEventListener('touchstart', detectUserInteraction);
    
    // Try to preload voices to improve first-time playback
    if (window.speechSynthesis) {
      try {
        const voices = window.speechSynthesis.getVoices();
        console.log(`Preloaded ${voices.length} voices at init`);
      } catch (e) {
        console.log('Voice preloading failed:', e);
      }
    }
    
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
