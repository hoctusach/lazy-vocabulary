
import { useState, useEffect } from 'react';
import {
  getLocalPreferences,
  saveLocalPreferences,
} from '@/lib/preferences/localPreferences';

interface VoiceSettings {
  isMuted: boolean;
  voiceRegion: 'US' | 'UK' | 'AU';
}

export const useVoiceSettings = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK' | 'AU'>('UK');

  useEffect(() => {
    getLocalPreferences()
      .then(p => {
        setIsMuted(!!p.is_muted);
      })
      .catch(() => {});
  }, []);

  // Update mute state in localStorage when it changes
  useEffect(() => {
    saveLocalPreferences({ is_muted: isMuted }).catch(err =>
      console.error('Error saving mute state', err),
    );
  }, [isMuted]);

  return {
    isMuted,
    voiceRegion,
    setIsMuted,
    setVoiceRegion
  };
};
