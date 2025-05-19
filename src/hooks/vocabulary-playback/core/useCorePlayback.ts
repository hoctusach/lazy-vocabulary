
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
    const initSpeechSynthesis = () => {
      if (!window.speechSynthesis || speechInitializedRef.current) return;
      
      try {
        // Try to get initial voices - this might prompt permission on some browsers
        window.speechSynthesis.getVoices();
        
        // Create a silent utterance to help initialize the speech system
        const initUtterance = new SpeechSynthesisUtterance(' ');
        initUtterance.volume = 0; // Silent
        initUtterance.onend = () => {
          console.log("Speech synthesis initialized successfully");
          speechInitializedRef.current = true;
        };
        initUtterance.onerror = () => {
          console.log("Speech synthesis initialization error - may need user interaction");
        };
        
        // Add user interaction listener to help with speech permission
        const handleUserInteraction = () => {
          userInteractionRef.current = true;
          // Only try speaking once
          if (!speechInitializedRef.current) {
            window.speechSynthesis.speak(initUtterance);
          }
          // Remove the event listener after first interaction
          document.removeEventListener('click', handleUserInteraction);
          document.removeEventListener('touchstart', handleUserInteraction);
        };
        
        // Listen for user interaction
        document.addEventListener('click', handleUserInteraction);
        document.addEventListener('touchstart', handleUserInteraction);
        
        // Clean up
        return () => {
          document.removeEventListener('click', handleUserInteraction);
          document.removeEventListener('touchstart', handleUserInteraction);
        };
      } catch (error) {
        console.error("Error initializing speech synthesis", error);
      }
    };
    
    initSpeechSynthesis();
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
