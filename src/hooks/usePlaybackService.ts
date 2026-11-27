import { useEffect, useRef } from 'react';
import {
  isPlaybackServiceRunning,
  setPlaybackHandlers,
  setPlaybackQueue,
  type PlaybackQueue,
  startPlaybackService,
  stopPlaybackService,
  updatePlaybackService,
} from '@/services/background/playbackService';

/** A paused player keeps its notification this long (Play stays available), then the service stops to save battery. */
export const PAUSED_KEEP_ALIVE_MS = 15 * 60 * 1000;

interface Options {
  /** True while words are advancing (not paused). Muted playback still advances, so keep it on. */
  isPlaying: boolean;
  /** There is a word to show on the lock-screen card (paused or not). Defaults to isPlaying. */
  active?: boolean;
  word?: string | null;
  detail?: string | null;
  onPause: () => void;
  onNext: () => void;
  /** Resume from the notification / lock screen. */
  onPlay?: () => void;
  /** FB-52: upcoming words + voice config for the native service (re-pushed when it changes: learned/skip/list/voice). */
  queue?: PlaybackQueue | null;
  /** Index of the current word inside `queue.items`. */
  index?: number;
  /** FB-52: native advanced the queue while JS was frozen; jump to `index` (called on hand-back). */
  onNativeSync?: (index: number) => void;
}

/**
 * Keeps the Android media foreground service + lock-screen card in step with playback. No-op off native Android.
 * Playing: card shows the current word with Pause/Next. Paused: the card stays with Play/Next (until PAUSED_KEEP_ALIVE_MS).
 * Never driven by page visibility (FB-01/FB-31): hiding the app must not stop it.
 */
export function usePlaybackService({ isPlaying, active, word, detail, onPause, onNext, onPlay, queue, index, onNativeSync }: Options): void {
  const handlersRef = useRef({ onPause, onNext, onPlay, onNativeSync });
  handlersRef.current = { onPause, onNext, onPlay, onNativeSync };
  const hasCard = (active ?? isPlaying) && !!word;

  useEffect(() => {
    setPlaybackHandlers({
      onPlay: () => handlersRef.current.onPlay?.(),
      onPause: () => handlersRef.current.onPause(),
      onNext: () => handlersRef.current.onNext(),
      onNativeState: (s) => { if (s.sync) handlersRef.current.onNativeSync?.(s.index); },
    });
    return () => {
      setPlaybackHandlers(null);
      void stopPlaybackService();
    };
  }, []);

  // FB-52: the native service owns the upcoming queue. Pushed when the list/voice/mute changes (the index travels with the word updates), never on visibility.
  const indexRef = useRef(index);
  indexRef.current = index;
  useEffect(() => {
    if (queue && queue.items.length > 0) void setPlaybackQueue({ ...queue, index: indexRef.current ?? queue.index });
  }, [queue]);

  useEffect(() => {
    if (isPlaying && word) {
      void startPlaybackService({ title: word, text: detail || '', playing: true, ...(index !== undefined ? { index } : {}) });
      return;
    }
    if (hasCard && word && isPlaybackServiceRunning()) {
      void updatePlaybackService({ title: word, text: detail || '', playing: false, ...(index !== undefined ? { index } : {}) });
      const t = setTimeout(() => void stopPlaybackService(), PAUSED_KEEP_ALIVE_MS);
      return () => clearTimeout(t);
    }
    void stopPlaybackService();
  }, [isPlaying, hasCard, word, detail, index]);
}
