import { registerPlugin } from '@capacitor/core';
import { isNativeAndroid, isNativeIOS } from '@/lib/platform/platformKind';
import { pauseIosNowPlaying, startIosNowPlaying, stopIosNowPlaying } from './iosNowPlaying';

export interface PlaybackInfo {
  title: string;
  text: string;
  /** True while words advance; false = paused (the notification stays, with a Play button). Default true. */
  playing?: boolean;
  /** Index of the current word in the native queue (FB-52). */
  index?: number;
}
export type PlaybackAction = 'play' | 'pause' | 'next';

/** One upcoming word handed to the native service (FB-52). */
export interface PlaybackQueueItem {
  word: string;
  meaning?: string;
  example?: string;
  translation?: string;
  category?: string;
  /** [FB-65] Card-style category label shown in the notification. */
  categoryLabel?: string;
  /** Pause after the word before the next one starts. */
  pauseMs?: number;
}
export interface PlaybackQueue {
  items: PlaybackQueueItem[];
  /** Index of the word currently on the card. */
  index: number;
  engine: 'kokoro' | 'system';
  voice?: string;
  /** [FB-61] The saved SYSTEM voice (native voice name / voiceURI) so the service speaks with it, not the engine default. */
  voiceName?: string;
  speed?: number;
  rate?: number;
  lang?: string;
  muted?: boolean;
}
export interface PlaybackNativeState { index: number; playing: boolean; native: boolean; sync: boolean }

interface PlaybackServicePlugin {
  setQueue(queue: PlaybackQueue): Promise<void>;
  start(info: PlaybackInfo): Promise<void>;
  update(info: PlaybackInfo): Promise<void>;
  stop(): Promise<void>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
  addListener(
    event: 'action',
    cb: (e: { action: PlaybackAction }) => void,
  ): Promise<{ remove: () => Promise<void> }>;
  addListener(
    event: 'state',
    cb: (e: PlaybackNativeState) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

const Native = registerPlugin<PlaybackServicePlugin>('PlaybackService');

/** Native Android has the foreground service (+ native queue); web is a no-op. iOS uses the Now Playing fallback. */
export function isBackgroundPlaybackSupported(): boolean {
  return isNativeAndroid();
}

/** [FB-68] iOS: UIBackgroundModes=audio + silent loop + Media Session (see iosNowPlaying.ts). */
export function isIosNowPlayingSupported(): boolean {
  return isNativeIOS();
}

export interface PlaybackHandlers {
  onPlay?: () => void;
  onPause: () => void;
  onNext: () => void;
  /** Native moved the queue while the WebView was frozen; `index` is the word it reached (sync = hand-back). */
  onNativeState?: (state: PlaybackNativeState) => void;
}

let running = false;
let askedPermission = false;
let handlers: PlaybackHandlers | null = null;
let listener: { remove: () => Promise<void> } | null = null;
let listenerPending = false;
let stateListener: { remove: () => Promise<void> } | null = null;

export function setPlaybackHandlers(h: PlaybackHandlers | null): void {
  handlers = h;
}

async function ensureListener(): Promise<void> {
  if (listener || listenerPending) return;
  listenerPending = true;
  try {
    listener = await Native.addListener('action', ({ action }) => {
      if (action === 'play') handlers?.onPlay?.();
      else if (action === 'pause') handlers?.onPause();
      else if (action === 'next') handlers?.onNext();
    });
    stateListener = await Native.addListener('state', (e) => handlers?.onNativeState?.(e));
  } catch {
    /* notification buttons just won't work */
  } finally {
    listenerPending = false;
  }
}

/** Start (or refresh) the foreground service. Asks for notification permission once; denial is fine. */
export async function startPlaybackService(info: PlaybackInfo): Promise<void> {
  if (isIosNowPlayingSupported()) {
    running = true;
    syncWebMediaSession({ ...info, playing: info.playing !== false });
    if (info.playing !== false) await startIosNowPlaying();
    else pauseIosNowPlaying();
    return;
  }
  if (!isBackgroundPlaybackSupported()) return;
  syncWebMediaSession({ ...info, playing: info.playing !== false });
  try {
    if (!askedPermission) {
      askedPermission = true;
      await Native.requestNotificationPermission().catch(() => undefined);
    }
    await ensureListener();
    if (running) {
      await Native.update(info);
    } else {
      running = true;
      await Native.start(info);
    }
  } catch (e) {
    running = false;
    console.warn('[playbackService] start failed', e);
  }
}

/**
 * Web Media Session API in addition to the native session (a WebView/Chrome that supports it shows the same now-playing
 * metadata and routes hardware/Bluetooth media keys to the same handlers). Never replaces the native notification.
 */
export function syncWebMediaSession(info: PlaybackInfo | null): void {
  try {
    const ms = typeof navigator !== 'undefined' ? (navigator as Navigator & { mediaSession?: MediaSession }).mediaSession : undefined;
    if (!ms) return;
    if (!info) {
      ms.metadata = null;
      ms.playbackState = 'none';
      return;
    }
    if (typeof MediaMetadata !== 'undefined') {
      ms.metadata = new MediaMetadata({ title: info.title, artist: info.text, album: 'Lazy Vocabulary' });
    }
    ms.playbackState = info.playing === false ? 'paused' : 'playing';
    ms.setActionHandler('play', () => handlers?.onPlay?.());
    ms.setActionHandler('pause', () => handlers?.onPause());
    ms.setActionHandler('nexttrack', () => handlers?.onNext());
  } catch {
    /* unsupported handler/action: the native session still works */
  }
}

/**
 * Hand the native service the upcoming queue + voice config (FB-52). The service advances it itself (Handler pause +
 * native Kokoro/TextToSpeech) when the WebView is throttled or frozen. Never driven by page visibility.
 */
export async function setPlaybackQueue(queue: PlaybackQueue): Promise<void> {
  if (!isBackgroundPlaybackSupported()) return;
  try {
    await Native.setQueue(queue);
  } catch (e) {
    console.warn('[playbackService] setQueue failed', e);
  }
}

export async function updatePlaybackService(info: PlaybackInfo): Promise<void> {
  if (isIosNowPlayingSupported() && running) {
    syncWebMediaSession(info);
    if (info.playing === false) pauseIosNowPlaying();
    else await startIosNowPlaying();
    return;
  }
  if (!isBackgroundPlaybackSupported() || !running) return;
  syncWebMediaSession(info);
  try {
    await Native.update(info);
  } catch (e) {
    console.warn('[playbackService] update failed', e);
  }
}

export async function stopPlaybackService(): Promise<void> {
  if (isIosNowPlayingSupported() && running) {
    running = false;
    syncWebMediaSession(null);
    stopIosNowPlaying();
    return;
  }
  if (!isBackgroundPlaybackSupported() || !running) return;
  running = false;
  syncWebMediaSession(null);
  try {
    await Native.stop();
  } catch (e) {
    console.warn('[playbackService] stop failed', e);
  }
}

export function isPlaybackServiceRunning(): boolean {
  return running;
}

/** Test helper. */
export function __resetPlaybackServiceForTests(): void {
  running = false;
  askedPermission = false;
  handlers = null;
  listener = null;
  stateListener = null;
  listenerPending = false;
}
