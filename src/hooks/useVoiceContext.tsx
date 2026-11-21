import { useState, useEffect, useRef } from 'react';
import { logAvailableVoices } from '@/utils/speech/debug/logVoices';
import { markVoiceExplicit } from '@/services/speech/kokoro/kokoroPrefs';
import { isKokoroVoiceName } from '@/services/speech/kokoro/kokoroVoices';
import { getFavoriteVoice, setFavoriteVoice } from '@/lib/preferences/localPreferences';

export interface VoiceContext {
  allVoices: SpeechSynthesisVoice[];
  selectedVoiceName: string;
  setSelectedVoiceName: (name: string) => void;
  cycleVoice: () => void;
}

export const useVoiceContext = (): VoiceContext => {
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');
  // Kokoro voices appear asynchronously (after the model status loads): while one is the saved favorite but not
  // listed yet we show the first system voice without overwriting the saved choice.
  const skipPersist = useRef(false);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis
        .getVoices()
        .filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
      logAvailableVoices(voices);
      setAllVoices(voices);

      const favorite = getFavoriteVoice();
      const preferred = favorite
        ? voices.find(v => v.name === favorite)
        : undefined;
      if (preferred) {
        setSelectedVoiceName(preferred.name);
      } else if (voices.length > 0) {
        skipPersist.current = isKokoroVoiceName(favorite);
        setSelectedVoiceName(voices[0].name);
      }
    };

    window.speechSynthesis?.addEventListener?.('voiceschanged', loadVoices);
    loadVoices();

    return () => {
      window.speechSynthesis?.removeEventListener?.('voiceschanged', loadVoices);
    };
  }, []);

  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    if (selectedVoiceName) {
      setFavoriteVoice(selectedVoiceName);
    }
  }, [selectedVoiceName]);

  const cycleVoice = () => {
    if (allVoices.length < 2) return;
    const index = allVoices.findIndex(v => v.name === selectedVoiceName);
    const nextIndex = (index + 1) % allVoices.length;
    const nextVoice = allVoices[nextIndex];
    markVoiceExplicit();
    setSelectedVoiceName(nextVoice.name);
    setFavoriteVoice(nextVoice.name);
  };

  return { allVoices, selectedVoiceName, setSelectedVoiceName, cycleVoice };
};
