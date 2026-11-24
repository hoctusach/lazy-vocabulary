import { useEffect, useRef } from 'react';
import {
  isPlaybackServiceRunning,
  setPlaybackHandlers,
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
}

/**
 * Keeps the Android media foreground service + lock-screen card in step with playback. No-op off native Android.
 * Playing: card shows the current word with Pause/Next. Paused: the card stays with Play/Next (until PAUSED_KEEP_ALIVE_MS).
 * Never driven by page visibility (FB-01/FB-31): hiding the app must not stop it.
 */
export function usePlaybackService({ isPlaying, active, word, detail, onPause, onNext, onPlay }: Options): void {
  const handlersRef = useRef({ onPause, onNext, onPlay });
  handlersRef.current = { onPause, onNext, onPlay };
  const hasCard = (active ?? isPlaying) && !!word;

  useEffect(() => {
    setPlaybackHandlers({
      onPlay: () => handlersRef.current.onPlay?.(),
      onPause: () => handlersRef.current.onPause(),
      onNext: () => handlersRef.current.onNext(),
    });
    return () => {
      setPlaybackHandlers(null);
      void stopPlaybackService();
    };
  }, []);

  useEffect(() => {
    if (isPlaying && word) {
      void startPlaybackService({ title: word, text: detail || '', playing: true });
      return;
    }
    if (hasCard && word && isPlaybackServiceRunning()) {
      void updatePlaybackService({ title: word, text: detail || '', playing: false });
      const t = setTimeout(() => void stopPlaybackService(), PAUSED_KEEP_ALIVE_MS);
      return () => clearTimeout(t);
    }
    void stopPlaybackService();
  }, [isPlaying, hasCard, word, detail]);
}
