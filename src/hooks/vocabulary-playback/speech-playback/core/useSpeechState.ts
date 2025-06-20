
import { useState, useRef } from 'react';

/**
 * Hook for managing speech state
 */
export const useSpeechState = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isPlayingRef = useRef(false);

  return {
    isSpeaking,
    setIsSpeaking,
    isPlayingRef
  };
};
