import { useState, useEffect } from 'react';

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
      const voices = window.speechSynthesis.getVoices();
      setAllVoices(voices);
      if (!selectedVoiceName && voices.length > 1) {
        setSelectedVoiceName(voices[0].name);
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
      localStorage.setItem('selectedVoiceName', selectedVoiceName);
    }
  }, [selectedVoiceName]);

  const cycleVoice = () => {
    if (allVoices.length === 0) return;
    const index = allVoices.findIndex(v => v.name === selectedVoiceName);
    const nextIndex = (index + 1) % allVoices.length;
    const nextVoice = allVoices[nextIndex];
    setSelectedVoiceName(nextVoice.name);
    localStorage.setItem('selectedVoiceName', nextVoice.name);
    alert(`Voice "${nextVoice.name}" selected!`);
  };

  return { allVoices, selectedVoiceName, setSelectedVoiceName, cycleVoice };
};
