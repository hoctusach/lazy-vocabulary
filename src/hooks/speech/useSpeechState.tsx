
import { useRef, useCallback, useEffect } from 'react';

export const useSpeechState = () => {
  // For keeping track of speaking state
  const isSpeakingRef = useRef(false);
  const speakingLockRef = useRef(false);
  const activeUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const lastSpokenTextRef = useRef<string>('');
  const pauseRequestedRef = useRef(false);

  // Function to stop current speech
  const stopSpeakingLocal = useCallback(() => {
    // Cancel any ongoing speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    activeUtterancesRef.current = [];
    isSpeakingRef.current = false;
    speakingLockRef.current = false;
    pauseRequestedRef.current = false;
    console.log('Speech stopped');
  }, []);
  
  // Function to pause current speech
  const pauseSpeakingLocal = useCallback(() => {
    console.log('Soft pause requested');
    pauseRequestedRef.current = true;
    // Note: we no longer call speechSynthesis.pause() directly
    // Instead we let the current utterance finish
  }, []);
  
  // Function to resume speech
  const resumeSpeakingLocal = useCallback(() => {
    console.log('Resuming speech');
    pauseRequestedRef.current = false;
    // The next word will be spoken when the regular flow continues
  }, []);

  // Reset local flags if a speech cancellation error occurs
  useEffect(() => {
    const handleCanceled = () => {
      console.log('[SpeechState] Resetting flags after cancellation');
      stopSpeakingLocal();
    };
    document.addEventListener('speech-canceled', handleCanceled);
    return () => {
      document.removeEventListener('speech-canceled', handleCanceled);
    };
  }, [stopSpeakingLocal]);

  return {
    isSpeakingRef,
    speakingLockRef,
    activeUtterancesRef,
    lastSpokenTextRef,
    pauseRequestedRef,
    stopSpeakingLocal,
    pauseSpeakingLocal,
    resumeSpeakingLocal
  };
};
