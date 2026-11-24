import { useState, useEffect, useRef } from 'react';
import { logAvailableVoices } from '@/utils/speech/debug/logVoices';
import { nextAllowedVoice, sanitizeVoiceName } from '@/services/speech/voiceAccess';
import { markVoiceExplicit } from '@/services/speech/kokoro/kokoroPrefs';
import { isKokoroVoiceName } from '@/services/speech/kokoro/kokoroVoices';
import { loadNativeSystemVoices, mergeSystemVoices } from '@/services/speech/voiceCatalog';
import { VOICE_SELECTED_EVENT } from '@/services/speech/voiceSelection';
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
    let alive = true;
    let retries = 3;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const loadVoices = async () => {
      // [FB-41] merge the web list with the device's native voices: an empty WebView list cannot hide them.
      let web: SpeechSynthesisVoice[] = [];
      try { web = window.speechSynthesis?.getVoices?.() ?? []; } catch { web = []; }
      const native = await loadNativeSystemVoices();
      if (!alive) return;
      const voices = mergeSystemVoices(web, native);
      logAvailableVoices(voices);
      setAllVoices(voices);

      if (voices.length === 0 && retries-- > 0) {
        retryTimer = setTimeout(() => void loadVoices(), 1500);
      }

      const favorite = sanitizeVoiceName(getFavoriteVoice());
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
    const reload = () => void loadVoices();
    const onVisible = () => { if (document.visibilityState === 'visible') reload(); };
    const onSelected = (e: Event) => {
      const name = (e as CustomEvent<{ name?: string }>).detail?.name;
      if (name) setSelectedVoiceName(name);
    };

    window.speechSynthesis?.addEventListener?.('voiceschanged', reload);
    window.addEventListener(VOICE_SELECTED_EVENT, onSelected);
    document.addEventListener('visibilitychange', onVisible);
    reload();

    return () => {
      alive = false;
      if (retryTimer) clearTimeout(retryTimer);
      window.speechSynthesis?.removeEventListener?.('voiceschanged', reload);
      window.removeEventListener(VOICE_SELECTED_EVENT, onSelected);
      document.removeEventListener('visibilitychange', onVisible);
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
    const nextVoice = nextAllowedVoice(allVoices, selectedVoiceName);
    if (!nextVoice) return;
    markVoiceExplicit();
    setSelectedVoiceName(nextVoice.name);
    setFavoriteVoice(nextVoice.name);
  };

  return { allVoices, selectedVoiceName, setSelectedVoiceName, cycleVoice };
};
