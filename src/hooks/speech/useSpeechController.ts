
import { useState, useEffect, useCallback } from 'react';
import { speechController } from '@/utils/speech/core/speechController';

/**
 * Hook to interact with the centralized speech controller
 */
export const useSpeechController = () => {
  const [speechState, setSpeechState] = useState(speechController.getState());

  // Subscribe to controller state changes
  useEffect(() => {
    const unsubscribe = speechController.subscribe(setSpeechState);
    return unsubscribe;
  }, []);

  // Speak function with controller
  const speak = useCallback(async (
    text: string,
    options: {
      voice?: SpeechSynthesisVoice | null;
      rate?: number;
      pitch?: number;
      volume?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: SpeechSynthesisErrorEvent) => void;
    } = {}
  ) => {
    return await speechController.speak(text, options);
  }, []);

  // Control functions
  const stop = useCallback(() => {
    speechController.stop();
  }, []);

  const pause = useCallback(() => {
    speechController.pause();
  }, []);

  const resume = useCallback(() => {
    speechController.resume();
  }, []);

  return {
    // State
    isActive: speechState.isActive,
    isPaused: speechState.isPaused,
    currentUtterance: speechState.currentUtterance,
    
    // Actions
    speak,
    stop,
    pause,
    resume,
    
    // Utilities
    isCurrentlyActive: speechController.isActive()
  };
};
