import { useState, useEffect, useCallback } from 'react';
import { logAvailableVoices } from '@/utils/speech/debug/logVoices';
import { VoiceSelection } from '../useVoiceSelection';
import { toast } from 'sonner';
import { getFavoriteVoice, setFavoriteVoice } from '@/lib/preferences/localPreferences';

/**
 * Hook for managing voice selection and finding appropriate voices
 */
export const useVoiceManagement = () => {
  const allVoiceOptions: VoiceSelection[] = [
    { label: 'US', region: 'US', gender: 'female', index: 0 },
    { label: 'UK', region: 'UK', gender: 'female', index: 1 },
    { label: 'AU', region: 'AU', gender: 'female', index: 2 },
  ];

  const [voiceIndex, setVoiceIndex] = useState(0);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  // UI-friendly voice list
  const voices = [
    { label: 'US', region: 'US' as const, gender: 'female' as const, voice: null },
    { label: 'UK', region: 'UK' as const, gender: 'female' as const, voice: null },
    { label: 'AU', region: 'AU' as const, gender: 'female' as const, voice: null },
  ];

  useEffect(() => {
    // Load stored preference
    const favorite = getFavoriteVoice();
    if (favorite) {
      const idx = allVoiceOptions.findIndex(v => v.label === favorite);
      if (idx >= 0) setVoiceIndex(idx);
    }

    // Preload available voices and warn on missing variants
    const loadVoicesAndNotify = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      logAvailableVoices(availableVoices);
      if (availableVoices.length > 0) {
        console.log(`Voices loaded: found ${availableVoices.length} voices`);
        setVoicesLoaded(true);

        const hasUSVoice = availableVoices.some(v => v.lang?.toLowerCase().startsWith('en-us'));
        const hasUKVoice = availableVoices.some(v => v.lang?.toLowerCase().startsWith('en-gb'));

        if (!hasUSVoice || !hasUKVoice) {
          toast.warning('Some English voices may not be available. Speech quality might be affected.');
        }
      }
    };

    loadVoicesAndNotify();

    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoicesAndNotify);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoicesAndNotify);
      };
    }
  }, [allVoiceOptions]);

  const findVoice = useCallback((region: 'US' | 'UK' | 'AU'): SpeechSynthesisVoice | null => {
    console.log(`Looking for ${region} voice`);

    const allVoices = window.speechSynthesis.getVoices();
    logAvailableVoices(allVoices);
    console.log(`Finding voice among ${allVoices.length} voices`);

    if (allVoices.length === 0) {
      console.warn('No voices available');
      return null;
    }

    const langCode = region === 'US' ? 'en-US' : region === 'UK' ? 'en-GB' : 'en-AU';
    let voice = allVoices.find(v => v.lang?.toLowerCase().startsWith(langCode.toLowerCase()));
    if (voice) {
      console.log(`Selected ${region} voice by language code: ${voice.name} (${voice.lang})`);
      return voice;
    }

    voice = allVoices.find(v => v.lang?.startsWith('en'));
    if (voice) {
      console.log(`Selected any English voice for ${region}: ${voice.name} (${voice.lang})`);
      return voice;
    }

    if (allVoices.length > 0) {
      console.log('No suitable English voice found, using first available voice');
      return allVoices[0];
    }

    console.warn('No suitable voice found');
    return null;
  }, []);

  const cycleVoice = useCallback(() => {
    setVoiceIndex(prevIndex => {
      const currentRegion = allVoiceOptions[prevIndex].region;
      const nextRegion = currentRegion === 'UK' ? 'US' : currentRegion === 'US' ? 'AU' : 'US';
      const nextIndex = allVoiceOptions.findIndex(v => v.region === nextRegion);

      console.log(`Cycling voice from ${allVoiceOptions[prevIndex].label} to ${allVoiceOptions[nextIndex].label}`);

      const voiceName = allVoiceOptions[nextIndex].label;
      setFavoriteVoice(voiceName);
      toast.success(`Voice changed to ${allVoiceOptions[nextIndex].label}`);

      return nextIndex;
    });
  }, [allVoiceOptions]);

  const selectedVoice = allVoiceOptions[voiceIndex % allVoiceOptions.length];

  return {
    voices,
    voiceIndex,
    selectedVoice,
    allVoiceOptions,
    findVoice,
    cycleVoice,
    voicesLoaded,
  };
};
