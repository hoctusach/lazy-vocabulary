import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRegionVoices } from './useRegionVoices';
import { logAvailableVoices } from '@/utils/speech/debug/logVoices';

export interface VoiceMap {
  US: SpeechSynthesisVoice[];
  UK: SpeechSynthesisVoice[];
  AU: SpeechSynthesisVoice[];
}

export interface VoiceContext {
  allVoices: VoiceMap;
  selectedVoiceNames: { US: string; UK: string; AU: string };
  setSelectedVoiceName: (region: 'US' | 'UK' | 'AU', name: string) => void;
  cycleVoice: (region: 'US' | 'UK' | 'AU') => void;
}

export const useVoiceContext = (): VoiceContext => {
  const { usVoices, ukVoices, auVoices } = useRegionVoices();
  const [selectedVoiceNames, setSelectedVoiceNames] = useState<{ US: string; UK: string; AU: string }>({ US: '', UK: '', AU: '' });

  useEffect(() => {
    const stored = localStorage.getItem('voiceSettings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSelectedVoiceNames({
          US: parsed.us || '',
          UK: parsed.uk || '',
          AU: parsed.au || ''
        });
      } catch (e) {
        console.error('Failed to parse voiceSettings:', e);
      }
    }
  }, []);

  useEffect(() => {
    const settings = {
      us: selectedVoiceNames.US,
      uk: selectedVoiceNames.UK,
      au: selectedVoiceNames.AU
    };
    localStorage.setItem('voiceSettings', JSON.stringify(settings));
  }, [selectedVoiceNames]);

  const getArrayForRegion = (region: 'US' | 'UK' | 'AU') =>
    region === 'US' ? usVoices : region === 'UK' ? ukVoices : auVoices;

  const setSelectedVoiceName = (region: 'US' | 'UK' | 'AU', name: string) => {
    setSelectedVoiceNames(prev => ({ ...prev, [region]: name }));
  };

  const cycleVoice = (region: 'US' | 'UK' | 'AU') => {
    const list = getArrayForRegion(region);
    if (list.length < 2) return;
    const currentName = selectedVoiceNames[region];
    const index = list.findIndex(v => v.name === currentName);
    const nextIndex = (index + 1) % list.length;
    const nextVoice = list[nextIndex];
    setSelectedVoiceNames(prev => ({ ...prev, [region]: nextVoice.name }));
    toast.success(`Voice changed to ${nextVoice.name} (${nextVoice.lang})`);
  };

  const allVoices: VoiceMap = { US: usVoices, UK: ukVoices, AU: auVoices };

  return { allVoices, selectedVoiceNames, setSelectedVoiceName, cycleVoice };
};
