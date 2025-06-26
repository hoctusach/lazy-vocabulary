import { useState, useEffect } from 'react';
import { VOICE_SETTINGS_KEY } from '@/utils/storageKeys';

export type VoiceRegion = 'US' | 'UK' | 'AU';

interface VoiceContext {
  voiceRegion: VoiceRegion;
  setVoiceRegion: (region: VoiceRegion) => void;
}

export const useVoiceContext = (): VoiceContext => {
  const loadSettings = () => {
    try {
      const raw = localStorage.getItem(VOICE_SETTINGS_KEY);
      if (raw) {
        return JSON.parse(raw) as { voiceRegion?: VoiceRegion };
      }
    } catch (err) {
      console.error('Failed to load voice settings', err);
    }
    return {};
  };

  const saved = loadSettings();
  const defaultRegion: VoiceRegion = saved.voiceRegion || 'UK';

  const [voiceRegion, setVoiceRegionState] = useState<VoiceRegion>(defaultRegion);

  useEffect(() => {
    try {
      localStorage.setItem(
        VOICE_SETTINGS_KEY,
        JSON.stringify({ voiceRegion })
      );
    } catch (err) {
      console.error('Failed to save voice settings', err);
    }
  }, [voiceRegion]);

  const setVoiceRegion = (region: VoiceRegion) => {
    setVoiceRegionState(region);
  };

  return { voiceRegion, setVoiceRegion };
};
