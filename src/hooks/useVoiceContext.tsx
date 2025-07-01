import { useState, useEffect } from 'react';

export interface VoiceContext {
  allVoices: SpeechSynthesisVoice[];
  selectedVoiceName: string;
  setSelectedVoiceName: (name: string) => void;
}

export const useVoiceContext = (): VoiceContext => {
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState(
    localStorage.getItem('selectedVoiceName') || ''
  );

  useEffect(() => {
    const loadVoices = () => setAllVoices(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    loadVoices();
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  useEffect(() => {
    if (selectedVoiceName) {
      localStorage.setItem('selectedVoiceName', selectedVoiceName);
    }
  }, [selectedVoiceName]);

  return { allVoices, selectedVoiceName, setSelectedVoiceName };
};
