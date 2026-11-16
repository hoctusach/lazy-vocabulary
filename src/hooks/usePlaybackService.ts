import { useEffect, useRef } from 'react';
import {
  setPlaybackHandlers,
  startPlaybackService,
  stopPlaybackService,
} from '@/services/background/playbackService';

interface Options {
  /** True while words are advancing (not paused). Muted playback still advances, so keep it on. */
  isPlaying: boolean;
  word?: string | null;
  detail?: string | null;
  onPause: () => void;
  onNext: () => void;
}

/** Keeps the Android media foreground service in step with playback. No-op off native Android. */
export function usePlaybackService({ isPlaying, word, detail, onPause, onNext }: Options): void {
  const handlersRef = useRef({ onPause, onNext });
  handlersRef.current = { onPause, onNext };

  useEffect(() => {
    setPlaybackHandlers({
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
      void startPlaybackService({ title: word, text: detail || '' });
    } else {
      void stopPlaybackService();
    }
  }, [isPlaying, word, detail]);
}
