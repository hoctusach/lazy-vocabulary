
import { useState, useEffect } from 'react';
import { BUTTON_STATES_KEY } from '@/utils/storageKeys';

interface VoiceSettings {
  isMuted: boolean;
  voiceRegion: 'US' | 'UK' | 'AU';
}

export const useVoiceSettings = () => {
  const getInitialStates = (): VoiceSettings => {
    try {
      const storedStates = localStorage.getItem(BUTTON_STATES_KEY);
      if (storedStates) {
        const parsedStates = JSON.parse(storedStates);
        
        console.log("Retrieved voice settings:", {
          muted: parsedStates.isMuted === true,
          region: parsedStates.voiceRegion
        });
        
        return {
          isMuted: parsedStates.isMuted === true,
            voiceRegion:
              parsedStates.voiceRegion === 'UK' || parsedStates.voiceRegion === 'AU'
                ? parsedStates.voiceRegion
                : 'UK'
        };
      }
    } catch (error) {
      console.error('Error reading button states from localStorage:', error);
    }
    return { isMuted: false, voiceRegion: 'UK' };
  };

  const { isMuted: initialMuted, voiceRegion: initialVoiceRegion } = getInitialStates();
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK' | 'AU'>(initialVoiceRegion);

  // Update mute state in localStorage when it changes
  useEffect(() => {
    try {
      const storedStates = localStorage.getItem(BUTTON_STATES_KEY);
      const parsedStates = storedStates ? JSON.parse(storedStates) : {};
      parsedStates.isMuted = isMuted;
      localStorage.setItem(BUTTON_STATES_KEY, JSON.stringify(parsedStates));
    } catch (error) {
      console.error('Error saving mute state to localStorage:', error);
    }
  }, [isMuted]);

  return {
    isMuted,
    voiceRegion,
    setIsMuted,
    setVoiceRegion
  };
};
