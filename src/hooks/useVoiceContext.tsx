import { useState, useEffect } from 'react';
import { logAvailableVoices } from '@/utils/speech/debug/logVoices';
import { nextAllowedVoice, sanitizeVoiceName } from '@/services/speech/voiceAccess';
import { markVoiceExplicit } from '@/services/speech/kokoro/kokoroPrefs';
import { isKokoroVoiceName } from '@/services/speech/kokoro/kokoroVoices';
import { isKokoroSupported } from '@/services/speech/kokoro/kokoroTts';
import { bestFallbackVoice } from '@/services/speech/voiceFallback';
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
  // [FB-61] The saved favorite is written ONLY by an explicit choice (selectVoiceByName, cycleVoice, the natural-voice
  // default, model removal). A list that arrives late (Kokoro after the model status, native voices after the plugin
  // loads) must never rewrite it, so there is no "persist whatever is selected" effect here (nor in the data loader).

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
      } else if (favorite && isKokoroVoiceName(favorite) && isKokoroSupported()) {
        // Natural voice saved but not listed yet (model still loading/downloading): keep it selected. Speech waits for it
        // instead of falling to a system voice, and nothing is written.
        setSelectedVoiceName(favorite);
      } else if (voices.length > 0) {
        setSelectedVoiceName(bestFallbackVoice(voices).name);
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
