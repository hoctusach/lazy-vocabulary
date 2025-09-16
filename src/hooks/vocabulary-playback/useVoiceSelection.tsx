import { useState, useEffect } from 'react';
import { logAvailableVoices } from '@/utils/speech/debug/logVoices';
import { getFavoriteVoice, setFavoriteVoice } from '@/lib/preferences/localPreferences';

export type VoiceOption = {
  label: string;
  region: 'US' | 'UK' | 'AU';
  gender: 'male' | 'female';
  voice: SpeechSynthesisVoice | null;
};

export interface VoiceSelection {
  label: string;
  region: 'US' | 'UK' | 'AU';
  gender: 'male' | 'female';
  index: number;
}

const VOICE_OPTIONS: VoiceSelection[] = [
  { label: 'US', region: 'US', gender: 'female', index: 0 },
  { label: 'UK', region: 'UK', gender: 'female', index: 1 },
  { label: 'AU', region: 'AU', gender: 'female', index: 2 },
];

const DEFAULT_VOICE_OPTION: VoiceSelection = VOICE_OPTIONS[1];

export const useVoiceSelection = () => {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceSelection>(DEFAULT_VOICE_OPTION);
  const [voiceIndex, setVoiceIndex] = useState<number>(1);

  useEffect(() => {
    const loadVoices = () => {
      const synth = window.speechSynthesis;
      const availableVoices = synth.getVoices();
      logAvailableVoices(availableVoices);

      if (availableVoices.length) {
        const filteredVoices = availableVoices.filter(v =>
          v.lang &&
          (v.lang.toLowerCase().startsWith('en-us') ||
            v.lang.toLowerCase().startsWith('en-gb') ||
            v.lang.toLowerCase().startsWith('en-au'))
        );

        const usVoice = filteredVoices.find(v => v.lang.toLowerCase().startsWith('en-us')) || null;
        const ukVoice = filteredVoices.find(v => v.lang.toLowerCase().startsWith('en-gb')) || null;
        const auVoice = filteredVoices.find(v => v.lang.toLowerCase().startsWith('en-au')) || null;

        const voiceOptions: VoiceOption[] = [
          { label: 'US', region: 'US', gender: 'female', voice: usVoice },
          { label: 'UK', region: 'UK', gender: 'female', voice: ukVoice },
          { label: 'AU', region: 'AU', gender: 'female', voice: auVoice },
        ];

        setVoices(voiceOptions);

        const storedName = getFavoriteVoice();
        const matched = storedName ? voiceOptions.find(v => v.voice?.name === storedName) : null;
        if (matched) {
          setVoiceIndex(matched.index);
          setSelectedVoice({
            label: matched.label,
            region: matched.region,
            gender: matched.gender,
            index: matched.index,
          });
          console.log(`Restored voice preference: ${matched.voice?.name}`);
        }
      }
    };

    loadVoices();
    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    } else {
      setTimeout(loadVoices, 500);
    }

    return () => {
      if ('onvoiceschanged' in window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(() => {
    const voiceName = voices[voiceIndex]?.voice?.name;
    if (voiceName) {
      setFavoriteVoice(voiceName);
    }
  }, [voiceIndex, voices]);

  const cycleVoice = () => {
    const currentRegion = selectedVoice.region;
    const nextRegion = currentRegion === 'UK' ? 'US' : currentRegion === 'US' ? 'AU' : 'US';
    const nextVoice = VOICE_OPTIONS.find(v => v.region === nextRegion)!;

    setVoiceIndex(nextVoice.index);
    setSelectedVoice(nextVoice);

    const voiceName = voices[nextVoice.index]?.voice?.name;
    if (voiceName) {
      setFavoriteVoice(voiceName);
    }
  };

  return {
    voices,
    selectedVoice,
    cycleVoice,
    voiceIndex,
    allVoiceOptions: VOICE_OPTIONS,
  };
};
