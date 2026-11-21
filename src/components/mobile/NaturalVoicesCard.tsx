import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getFavoriteVoice, setFavoriteVoice } from '@/lib/preferences/localPreferences';
import {
  cancelKokoroDownload,
  deleteKokoro,
  downloadKokoro,
  getKokoroState,
  isKokoroSupported,
  refreshKokoroStatus,
  subscribeKokoro,
} from '@/services/speech/kokoro/kokoroTts';
import { KOKORO_DOWNLOAD_BYTES, KOKORO_VOICES, getKokoroVoiceByName, isKokoroVoiceName } from '@/services/speech/kokoro/kokoroVoices';

const LAST_SYSTEM_VOICE_KEY = 'lazyVoca.lastSystemVoice';
const SYSTEM = 'system';
const mb = (bytes: number) => Math.round(bytes / 1_000_000);

function notifyVoicesChanged() {
  try {
    window.speechSynthesis?.dispatchEvent?.(new Event('voiceschanged'));
  } catch { /* ignore */ }
}

function systemVoices(): SpeechSynthesisVoice[] {
  try {
    return (window.speechSynthesis?.getVoices() ?? []).filter((v) => !isKokoroVoiceName(v.name));
  } catch {
    return [];
  }
}

function pickSystemVoiceName(): string | null {
  let remembered: string | null = null;
  try { remembered = window.localStorage.getItem(LAST_SYSTEM_VOICE_KEY); } catch { /* ignore */ }
  const list = systemVoices();
  if (remembered && list.some((v) => v.name === remembered)) return remembered;
  const en = list.find((v) => v.lang?.toLowerCase().startsWith('en'));
  return (en ?? list[0])?.name ?? null;
}

const NaturalVoicesCard: React.FC = () => {
  if (!isKokoroSupported()) return null;
  return <NaturalVoicesCardInner />;
};

const NaturalVoicesCardInner: React.FC = () => {
  const state = useSyncExternalStore(subscribeKokoro, getKokoroState);
  const [favorite, setFavorite] = useState<string | null>(() => getFavoriteVoice());
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { void refreshKokoroStatus(); }, []);

  const selected = (() => {
    const kv = getKokoroVoiceByName(favorite);
    return kv && state.downloaded ? kv.id : SYSTEM;
  })();

  const select = (value: string) => {
    if (value === SYSTEM) {
      const name = pickSystemVoiceName();
      if (name) setFavoriteVoice(name);
      setFavorite(name);
    } else {
      const kv = KOKORO_VOICES.find((v) => v.id === value);
      if (!kv) return;
      const current = getFavoriteVoice();
      if (current && !isKokoroVoiceName(current)) {
        try { window.localStorage.setItem(LAST_SYSTEM_VOICE_KEY, current); } catch { /* ignore */ }
      }
      setFavoriteVoice(kv.name);
      setFavorite(kv.name);
    }
    notifyVoicesChanged();
  };

  const remove = async () => {
    setConfirmDelete(false);
    const wasKokoro = isKokoroVoiceName(getFavoriteVoice());
    await deleteKokoro();
    if (wasKokoro) select(SYSTEM);
    else notifyVoicesChanged();
  };

  const preview = () => {
    try {
      const synth = window.speechSynthesis;
      const u = new SpeechSynthesisUtterance('Hello! This is how I sound.');
      const voice = synth.getVoices().find((v) => v.name === getFavoriteVoice());
      if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-US';
      u.rate = 0.8;
      synth.cancel();
      synth.speak(u);
    } catch { /* ignore */ }
  };

  const pct = state.totalBytes > 0 ? Math.min(100, Math.round((state.downloadedBytes / state.totalBytes) * 100)) : 0;
  const errorText = state.error === 'NO_SPACE' ? 'Not enough free storage on your phone.'
    : state.error === 'CHECKSUM' ? 'The download was corrupted. Please try again.'
    : state.error ? 'Download failed. Check your connection and try again.' : null;
  const muted = { color: 'var(--lv-text-secondary)' };

  return (
    <div className="rounded-2xl border p-4 text-sm theme-card-surface" style={{ borderColor: 'var(--lv-border-color)' }} data-section="natural-voices">
      <h3 className="mb-1 font-semibold" style={{ color: 'var(--lv-heading)' }}>Natural voices (offline)</h3>
      <p className="mb-3" style={muted}>
        High-quality Kokoro voices generated on your phone. One-time download of about 121 MB from Hugging Face - Wi-Fi
        recommended. After that they work offline.
      </p>

      <RadioGroup value={selected} onValueChange={select} aria-label="Voice engine">
        <label className="flex items-center gap-2" htmlFor="nv-system">
          <RadioGroupItem value={SYSTEM} id="nv-system" />
          <span>System voice</span>
        </label>
        {KOKORO_VOICES.map((v) => (
          <label key={v.id} className="flex items-center gap-2" htmlFor={`nv-${v.id}`} style={state.downloaded ? undefined : muted}>
            <RadioGroupItem value={v.id} id={`nv-${v.id}`} disabled={!state.downloaded} />
            <span>{v.gender === 'female' ? 'Kokoro - female (Heart)' : 'Kokoro - male (Michael)'}</span>
          </label>
        ))}
      </RadioGroup>

      <div className="mt-3 space-y-2">
        {state.downloading ? (
          <>
            <Progress value={pct} aria-label="Download progress" />
            <div className="flex items-center justify-between gap-2">
              <span style={muted}>{mb(state.downloadedBytes)} MB / {mb(state.totalBytes)} MB</span>
              <Button variant="outline" size="sm" onClick={() => void cancelKokoroDownload()}>Cancel</Button>
            </div>
          </>
        ) : state.downloaded ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={preview}>Preview</Button>
            {confirmDelete ? (
              <>
                <span style={muted}>Delete the downloaded voices?</span>
                <Button variant="destructive" size="sm" onClick={() => void remove()}>Delete</Button>
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Keep</Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>{`Delete voices (${mb(KOKORO_DOWNLOAD_BYTES)} MB)`}</Button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => void downloadKokoro()}>Download (121 MB)</Button>
          </div>
        )}
        {errorText && !state.downloading && (
          <div className="flex items-center justify-between gap-2" role="alert">
            <span className="text-red-600">{errorText}</span>
            <Button variant="outline" size="sm" onClick={() => void downloadKokoro()}>Retry</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NaturalVoicesCard;
