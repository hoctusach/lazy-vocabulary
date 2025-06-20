
import { useState, useCallback, useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { BUTTON_STATES_KEY } from '@/utils/storageKeys';

export const useMuteToggle = (
  isMuted: boolean,
  handleToggleMute: () => void,
  currentWord: VocabularyWord | null,
  isPaused: boolean,
  clearAutoAdvanceTimer: () => void,
  stopSpeech: () => void,
  voiceRegion: 'US' | 'UK' | 'AU'
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
      const buttonStates = JSON.parse(localStorage.getItem(BUTTON_STATES_KEY) || '{}');
      buttonStates.isMuted = !mute;
      localStorage.setItem(BUTTON_STATES_KEY, JSON.stringify(buttonStates));
    } catch (error) {
      console.error('Error updating mute state in localStorage:', error);
    }
    
    // Clear timers and stop any speech when muting to prevent auto-advance
    if (!mute) {
      clearAutoAdvanceTimer();
      stopSpeech();
    }
  }, [mute, handleToggleMute, clearAutoAdvanceTimer, stopSpeech]);
  
  return { mute, toggleMute };
};
