import { useState, useEffect } from 'react';
import { VOICE_SETTINGS_KEY } from '@/utils/storageKeys';
import { VOICE_VARIANTS } from '@/utils/speech/voiceVariants';
import type { VoiceVariant } from '@/utils/speech/voiceVariants';

export type VoiceRegion = 'US' | 'UK' | 'AU';

interface VoiceContext {
  voiceRegion: VoiceRegion;
  voiceVariant: VoiceVariant;
  setVoiceRegion: (region: VoiceRegion) => void;
  setVoiceVariant: (variant: VoiceVariant) => void;
}

export const useVoiceContext = (): VoiceContext => {
  const loadSettings = () => {
    try {
      const raw = localStorage.getItem(VOICE_SETTINGS_KEY);
      if (raw) {
        return JSON.parse(raw) as { voiceRegion?: VoiceRegion; voiceVariant?: VoiceVariant };
      }
    } catch (err) {
      console.error('Failed to load voice settings', err);
    }
    return {};
  };

  const saved = loadSettings();
  const defaultRegion: VoiceRegion = saved.voiceRegion || 'UK';
  const defaultVariant: VoiceVariant =
    saved.voiceVariant || VOICE_VARIANTS[defaultRegion][0];

  const [voiceRegion, setVoiceRegionState] = useState<VoiceRegion>(defaultRegion);
  const [voiceVariant, setVoiceVariantState] = useState<VoiceVariant>(defaultVariant);

  useEffect(() => {
    try {
      localStorage.setItem(
        VOICE_SETTINGS_KEY,
        JSON.stringify({ voiceRegion, voiceVariant })
      );
    } catch (err) {
      console.error('Failed to save voice settings', err);
    }
  }, [voiceRegion, voiceVariant]);

  const setVoiceRegion = (region: VoiceRegion) => {
    setVoiceRegionState(region);
    // Reset variant if region changes and variant is not in list
    if (!VOICE_VARIANTS[region].includes(voiceVariant)) {
      setVoiceVariantState(VOICE_VARIANTS[region][0]);
    }
  };

  const setVoiceVariant = (variant: VoiceVariant) => {
    setVoiceVariantState(variant);
  };

  return { voiceRegion, voiceVariant, setVoiceRegion, setVoiceVariant };
};
