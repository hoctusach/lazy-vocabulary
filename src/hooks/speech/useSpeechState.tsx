import { useRef, useCallback } from 'react';

export const useSpeechState = () => {
  // For keeping track of speaking state
  const isSpeakingRef = useRef(false);
  const speakingLockRef = useRef(false);
  const activeUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const lastSpokenTextRef = useRef<string>('');

  // Function to stop current speech
  const stopSpeakingLocal = useCallback(() => {
    // Cancel any ongoing speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    activeUtterancesRef.current = [];
    isSpeakingRef.current = false;
    speakingLockRef.current = false;
    console.log('Speech stopped');
  }, []);
  
  // Function to pause current speech
  const pauseSpeakingLocal = useCallback(() => {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      console.log('Pausing speech');
      window.speechSynthesis.pause();
    }
  }, []);
  
  // Function to resume speech
  const resumeSpeakingLocal = useCallback(() => {
    if (window.speechSynthesis && window.speechSynthesis.paused) {
      console.log('Resuming speech');
      window.speechSynthesis.resume();
    }
  }, []);

  return {
    isSpeakingRef,
    speakingLockRef,
    activeUtterancesRef,
    lastSpokenTextRef,
    stopSpeakingLocal,
    pauseSpeakingLocal,
    resumeSpeakingLocal
  };
};
