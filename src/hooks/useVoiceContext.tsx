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
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAllVoices(voices);
      if (!selectedVoiceName && voices.length > 0) {
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

  return { allVoices, selectedVoiceName, setSelectedVoiceName };
};
