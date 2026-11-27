import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { KOKORO_DOWNLOAD_BYTES } from './kokoroVoices';

export interface KokoroStatus {
  supported: boolean;
  downloaded: boolean;
  downloading: boolean;
  bytesOnDisk: number;
  downloadSize: number;
  version: string;
  variant?: 'fp32' | 'int8';
  upgradeAvailable?: boolean;
}

export interface KokoroNetwork {
  connected: boolean;
  metered: boolean;
}

export interface KokoroTtsPlugin {
  getStatus(): Promise<KokoroStatus>;
  getNetwork(): Promise<KokoroNetwork>;
  download(): Promise<KokoroStatus>;
  cancelDownload(): Promise<void>;
  deleteModel(): Promise<KokoroStatus>;
  speak(opts: { text: string; voice: string; speed: number }): Promise<{ interrupted: boolean }>;
  stop(): Promise<void>;
  release(): Promise<void>;
  addListener(event: 'downloadProgress', cb: (e: { downloaded: number; total: number; file: string }) => void): Promise<PluginListenerHandle>;
  addListener(event: 'downloadState', cb: (e: { state: 'downloading' | 'done' | 'error'; error?: string }) => void): Promise<PluginListenerHandle>;
}

// Wrapped in an object: a Capacitor plugin proxy must not be resolved from a promise (it would be treated as a thenable).
export interface KokoroHandle { plugin: KokoroTtsPlugin }

let handle: KokoroHandle | null = null;

export function isKokoroSupported(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

export function getKokoro(): KokoroHandle | null {
  if (!isKokoroSupported()) return null;
  if (!handle) {
    try {
      handle = { plugin: registerPlugin<KokoroTtsPlugin>('KokoroTts') };
    } catch {
      return null;
    }
  }
  return handle;
}

export interface KokoroState {
  downloaded: boolean;
  downloading: boolean;
  downloadedBytes: number;
  totalBytes: number;
  upgradeAvailable: boolean;
  error: string | null;
}

let state: KokoroState = { downloaded: false, downloading: false, downloadedBytes: 0, totalBytes: KOKORO_DOWNLOAD_BYTES, upgradeAvailable: false, error: null };
const listeners = new Set<() => void>();
let wired = false;

function set(patch: Partial<KokoroState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => { try { l(); } catch { /* ignore */ } });
}

export function getKokoroState(): KokoroState {
  return state;
}

export function subscribeKokoro(listener: () => void): () => void {
  listeners.add(listener);
  void wire();
  return () => { listeners.delete(listener); };
}

async function wire(): Promise<void> {
  if (wired) return;
  const h = getKokoro();
  if (!h) return;
  wired = true;
  try {
    await h.plugin.addListener('downloadProgress', (e) => set({ downloadedBytes: e.downloaded, totalBytes: e.total || KOKORO_DOWNLOAD_BYTES }));
    await h.plugin.addListener('downloadState', (e) => {
      if (e.state === 'downloading') set({ downloading: true, error: null });
      else if (e.state === 'done') set({ downloading: false, downloaded: true, upgradeAvailable: false });
      else set({ downloading: false, error: e.error || 'NETWORK' });
    });
  } catch {
    wired = false;
  }
}

function applyStatus(s: KokoroStatus | undefined) {
  if (!s) return;
  set({
    downloaded: !!s.downloaded,
    downloading: !!s.downloading,
    upgradeAvailable: !!s.upgradeAvailable,
    ...(s.downloadSize > 1 ? { totalBytes: s.downloadSize } : {}),
  });
}

export async function refreshKokoroStatus(): Promise<KokoroState> {
  const h = getKokoro();
  if (!h) return state;
  void wire();
  try { applyStatus(await h.plugin.getStatus()); } catch (e) { console.warn('[kokoro] status failed', e); }
  return state;
}

export async function downloadKokoro(): Promise<void> {
  const h = getKokoro();
  if (!h) return;
  void wire();
  set({ downloading: true, error: null, downloadedBytes: 0 });
  try {
    applyStatus(await h.plugin.download());
    set({ downloading: false, downloaded: true, upgradeAvailable: false });
  } catch (e) {
    const code = (e as { code?: string })?.code || 'NETWORK';
    set({ downloading: false, error: code === 'CANCELLED' ? null : code });
  }
}

export async function cancelKokoroDownload(): Promise<void> {
  try { await getKokoro()?.plugin.cancelDownload(); } catch { /* ignore */ }
}

export async function deleteKokoro(): Promise<void> {
  const h = getKokoro();
  if (!h) return;
  try { applyStatus(await h.plugin.deleteModel()); } catch (e) { console.warn('[kokoro] delete failed', e); }
  set({ downloaded: false, downloading: false, downloadedBytes: 0, upgradeAvailable: false });
}

/** Connectivity as seen by the OS. Unknown (plugin failure) is reported as offline. */
export async function getKokoroNetwork(): Promise<KokoroNetwork> {
  const h = getKokoro();
  if (!h) return { connected: false, metered: true };
  try {
    const n = await h.plugin.getNetwork();
    return { connected: !!n?.connected, metered: n?.metered !== false };
  } catch {
    return { connected: false, metered: true };
  }
}

/** Test helper. */
export function __resetKokoroForTests() {
  handle = null;
  wired = false;
  listeners.clear();
  state = { downloaded: false, downloading: false, downloadedBytes: 0, totalBytes: KOKORO_DOWNLOAD_BYTES, upgradeAvailable: false, error: null };
}
