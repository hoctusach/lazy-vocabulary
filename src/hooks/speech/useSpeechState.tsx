
import { useState, useEffect } from 'react';
import { stopSpeaking } from '@/utils/speech';

export const useSpeechState = () => {
  // Try to get the initial mute state from localStorage
  const initialMuted = localStorage.getItem('isMuted') === 'true';
  const [isMuted, setIsMuted] = useState(initialMuted);

  // Save mute state to localStorage when changed
  useEffect(() => {
    localStorage.setItem('isMuted', isMuted.toString());
  }, [isMuted]);

  const handleToggleMute = () => {
    setIsMuted(prev => {
      const newState = !prev;
      stopSpeaking();
      console.log(`Mute state changed to: ${newState}`);
      return newState;
    });
  };

  return {
    isMuted,
    handleToggleMute
  };
};
