import { Capacitor, registerPlugin } from '@capacitor/core';

export interface PlaybackInfo {
  title: string;
  text: string;
  /** True while words advance; false = paused (the notification stays, with a Play button). Default true. */
  playing?: boolean;
}
export type PlaybackAction = 'play' | 'pause' | 'next';

interface PlaybackServicePlugin {
  start(info: PlaybackInfo): Promise<void>;
  update(info: PlaybackInfo): Promise<void>;
  stop(): Promise<void>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
  addListener(
    event: 'action',
    cb: (e: { action: PlaybackAction }) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

const Native = registerPlugin<PlaybackServicePlugin>('PlaybackService');

/** Only native Android has the foreground service; everything else is a no-op. */
export function isBackgroundPlaybackSupported(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

export interface PlaybackHandlers { onPlay?: () => void; onPause: () => void; onNext: () => void }

let running = false;
let askedPermission = false;
let handlers: PlaybackHandlers | null = null;
let listener: { remove: () => Promise<void> } | null = null;
let listenerPending = false;

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
  } catch {
    /* notification buttons just won't work */
  } finally {
    listenerPending = false;
  }
}

/** Start (or refresh) the foreground service. Asks for notification permission once; denial is fine. */
export async function startPlaybackService(info: PlaybackInfo): Promise<void> {
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

export async function updatePlaybackService(info: PlaybackInfo): Promise<void> {
  if (!isBackgroundPlaybackSupported() || !running) return;
  syncWebMediaSession(info);
  try {
    await Native.update(info);
  } catch (e) {
    console.warn('[playbackService] update failed', e);
  }
}

export async function stopPlaybackService(): Promise<void> {
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
  listenerPending = false;
}
