import { toast } from 'sonner';
import { getFavoriteVoice, setFavoriteVoice } from '@/lib/preferences/localPreferences';
import {
  downloadKokoro,
  getKokoroNetwork,
  getKokoroState,
  isKokoroSupported,
  refreshKokoroStatus,
} from './kokoroTts';
import { getMeteredAnswer, isKokoroUserDeleted, isVoiceExplicit, setKokoroUserDeleted, setMeteredAnswer } from './kokoroPrefs';
import { KOKORO_VOICES, isKokoroVoiceName } from './kokoroVoices';

export type AutoCheckResult = 'unsupported' | 'ready' | 'busy' | 'deleted' | 'offline' | 'started' | 'prompt' | 'later';

const DEFAULT_KOKORO_VOICE = KOKORO_VOICES[0]; // Kokoro Heart (female)

// ---- one-time "mobile data" prompt state -------------------------------------------------------------------------
let promptVisible = false;
const uiListeners = new Set<() => void>();
export const getMeteredPromptVisible = (): boolean => promptVisible;
export function subscribeAutoDownloadUi(l: () => void): () => void {
  uiListeners.add(l);
  return () => { uiListeners.delete(l); };
}
function setPrompt(v: boolean) {
  if (promptVisible === v) return;
  promptVisible = v;
  uiListeners.forEach((l) => { try { l(); } catch { /* ignore */ } });
}

let checking = false;

/**
 * Decide whether to fetch the natural voice in the background. Called on app start and on every resume.
 * Wi-Fi -> silent download. Mobile data -> a single prompt (never again once answered). Offline -> try next time.
 */
export async function runAutoDownloadCheck(): Promise<AutoCheckResult> {
  if (!isKokoroSupported()) return 'unsupported';
  if (checking) return 'busy';
  checking = true;
  try {
    const s = await refreshKokoroStatus();
    if (s.downloading) return 'busy';
    if (s.downloaded && !s.upgradeAvailable) return 'ready';
    if (isKokoroUserDeleted()) return 'deleted';
    const net = await getKokoroNetwork();
    if (!net.connected) return 'offline';
    if (!net.metered) {
      void downloadKokoro();
      return 'started';
    }
    const answer = getMeteredAnswer();
    if (answer === 'later') return 'later';
    if (answer === 'now') {
      void downloadKokoro();
      return 'started';
    }
    setPrompt(true);
    return 'prompt';
  } finally {
    checking = false;
  }
}

/** The user answered the mobile-data prompt. */
export function answerMeteredPrompt(choice: 'now' | 'later'): void {
  setMeteredAnswer(choice);
  setPrompt(false);
  if (choice === 'now') void downloadKokoro();
}

/** User tapped Download / Re-download in More. */
export function userStartDownload(): void {
  setKokoroUserDeleted(false);
  void downloadKokoro();
}

function notifyVoicesChanged() {
  try { window.speechSynthesis?.dispatchEvent?.(new Event('voiceschanged')); } catch { /* ignore */ }
}

/**
 * Natural voice is the default once ready: select Kokoro Heart unless the user picked a voice themselves
 * (or already uses a Kokoro voice). Returns true when the saved voice changed.
 */
export function applyDefaultVoiceIfReady(announce: boolean): boolean {
  if (!getKokoroState().downloaded) return false;
  if (isVoiceExplicit() || isKokoroVoiceName(getFavoriteVoice())) return false;
  setFavoriteVoice(DEFAULT_KOKORO_VOICE.name);
  notifyVoicesChanged();
  if (announce) toast.success('Natural voice ready');
  return true;
}

/** Called after the model was removed by the user: fall back to a system voice and remember not to re-download. */
export function onUserDeletedModel(): void {
  setKokoroUserDeleted(true);
  if (isKokoroVoiceName(getFavoriteVoice())) {
    let name: string | null = null;
    try {
      const list = window.speechSynthesis?.getVoices() ?? [];
      const sys = list.filter((v) => !isKokoroVoiceName(v.name));
      name = (sys.find((v) => v.lang?.toLowerCase().startsWith('en')) ?? sys[0])?.name ?? null;
    } catch { /* ignore */ }
    if (name) setFavoriteVoice(name);
  }
  notifyVoicesChanged();
}
