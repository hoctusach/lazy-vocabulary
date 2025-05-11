
import { useState, useCallback, useEffect } from 'react';
import { stopSpeaking } from '@/utils/speech';
import { VocabularyWord } from '@/types/vocabulary';

export const useMuteToggle = (
  isMuted: boolean, 
  handleToggleMute: () => void,
  currentWord: VocabularyWord | null,
  isPaused: boolean,
  clearAutoAdvanceTimer: () => void,
  stopSpeaking: () => void,
  voiceRegion: 'US' | 'UK'
) => {
  const [mute, setMute] = useState(isMuted);
  
  // Sync with parent mute state
  useEffect(() => {
    setMute(isMuted);
  }, [isMuted]);
  
  // Toggle mute without restarting speech
  const toggleMute = useCallback(() => {
    console.log('[APP] Toggling mute state from', mute, 'to', !mute);
    setMute(!mute);
    handleToggleMute();
    
    // Don't restart speech, just update the muted state in localStorage
    try {
      const buttonStates = JSON.parse(localStorage.getItem('buttonStates') || '{}');
      buttonStates.isMuted = !mute;
      localStorage.setItem('buttonStates', JSON.stringify(buttonStates));
    } catch (error) {
      console.error('Error updating mute state in localStorage:', error);
    }
    
    // Clear timers when muting to prevent auto-advance
    if (!mute) {
      clearAutoAdvanceTimer();
    }
  }, [mute, handleToggleMute, clearAutoAdvanceTimer]);
  
  return { mute, toggleMute };
};
