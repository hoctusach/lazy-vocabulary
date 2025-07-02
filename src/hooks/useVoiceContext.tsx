import { useState, useEffect } from 'react';
import { PREFERRED_VOICE_KEY } from '@/utils/storageKeys';

export interface VoiceContext {
  allVoices: SpeechSynthesisVoice[];
  selectedVoiceName: string;
  setSelectedVoiceName: (name: string) => void;
  cycleVoice: () => void;
}

export const useVoiceContext = (): VoiceContext => {
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis
        .getVoices()
        .filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
      setAllVoices(voices);
      if (!selectedVoiceName && voices.length) {
        const stored = localStorage.getItem(PREFERRED_VOICE_KEY);
        const found = voices.find(v => v.name === stored);
        setSelectedVoiceName(found?.name || voices[0].name);
      }
    };

    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    loadVoices();
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [selectedVoiceName]);

  useEffect(() => {
    if (selectedVoiceName) {
      localStorage.setItem(PREFERRED_VOICE_KEY, selectedVoiceName);
    }
  }, [selectedVoiceName]);

  const cycleVoice = () => {
    if (allVoices.length <= 1) return;
    const index = allVoices.findIndex(v => v.name === selectedVoiceName);
    const nextIndex = (index + 1) % allVoices.length;
    const nextVoice = allVoices[nextIndex];
    setSelectedVoiceName(nextVoice.name);
    localStorage.setItem(PREFERRED_VOICE_KEY, nextVoice.name);
    alert(`Voice "${nextVoice.name} (${nextVoice.lang})" selected!`);
  };

  return { allVoices, selectedVoiceName, setSelectedVoiceName, cycleVoice };
};
