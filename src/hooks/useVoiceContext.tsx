import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { logAvailableVoices } from '@/utils/speech/debug/logVoices';
import {
  getLocalPreferences,
  saveLocalPreferences,
} from '@/lib/preferences/localPreferences';
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
      logAvailableVoices(voices);
      setAllVoices(voices);
      getLocalPreferences()
        .then(p => {
          const preferred = voices.find(v => v.name === p.favorite_voice);
          if (preferred) {
            setSelectedVoiceName(preferred.name);
          } else if (voices.length > 0) {
            setSelectedVoiceName(voices[0].name);
          }
        })
        .catch(() => {
          if (voices.length > 0) setSelectedVoiceName(voices[0].name);
        });
    };

    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    loadVoices();

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  useEffect(() => {
    if (selectedVoiceName) {
      saveLocalPreferences({ favorite_voice: selectedVoiceName }).catch(err =>
        console.error('Error saving voice preference', err),
      );
    }
  }, [selectedVoiceName]);

  const cycleVoice = () => {
    if (allVoices.length < 2) return;
    const index = allVoices.findIndex(v => v.name === selectedVoiceName);
    const nextIndex = (index + 1) % allVoices.length;
    const nextVoice = allVoices[nextIndex];
    setSelectedVoiceName(nextVoice.name);
    saveLocalPreferences({ favorite_voice: nextVoice.name }).catch(err =>
      console.error('Error saving voice preference', err),
    );
  };

  return { allVoices, selectedVoiceName, setSelectedVoiceName, cycleVoice };
};
