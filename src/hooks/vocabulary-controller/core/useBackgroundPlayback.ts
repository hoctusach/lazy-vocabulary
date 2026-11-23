import { useEffect, useRef } from 'react';
import type { VocabularyWord } from '@/types/vocabulary';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';
import { getSpeechRate } from '@/utils/speech/core/speechSettings';
import {
  isBackgroundPlaybackSupported,
  requestBackgroundNotifications,
  resolveResumeIndex,
  startBackgroundPlayback,
  stopBackgroundPlayback,
} from '@/lib/platform/backgroundPlayback';

const ASKED_KEY = 'lv.backgroundNotificationsAsked';

interface Params {
  wordList: VocabularyWord[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  isMuted: boolean;
  selectedVoiceName: string;
  allVoices: SpeechSynthesisVoice[];
  clearAutoAdvanceTimer: () => void;
  playCurrentWord: () => void;
}

/**
 * Keeps words playing when the Android app is backgrounded or the screen is off.
 * No-op on the web and on iOS.
 */
export const useBackgroundPlayback = (params: Params) => {
  const latest = useRef(params);
  latest.current = params;
  const handoff = useRef<{ startIndex: number; length: number } | null>(null);

  const playing = params.wordList.length > 0 && !params.isPaused && !params.isMuted;

  // Ask once for the notification permission so the player controls are visible.
  useEffect(() => {
    if (!playing || !isBackgroundPlaybackSupported()) return;
    try {
      if (localStorage.getItem(ASKED_KEY) === 'true') return;
      localStorage.setItem(ASKED_KEY, 'true');
    } catch {
      return;
    }
    void requestBackgroundNotifications();
  }, [playing]);

  useEffect(() => {
    if (!isBackgroundPlaybackSupported()) return undefined;
    let remove: (() => void) | null = null;
    let cancelled = false;

    const toBackground = async () => {
      const state = latest.current;
      if (handoff.current) return;
      if (state.isPaused || state.isMuted || state.wordList.length === 0) return;
      const voice = state.allVoices.find((item) => item.name === state.selectedVoiceName);
      state.clearAutoAdvanceTimer();
      unifiedSpeechController.stop();
      try {
        const started = await startBackgroundPlayback(state.wordList, state.currentIndex, {
          rate: getSpeechRate(),
          lang: voice?.lang || 'en-US',
        });
        if (started) {
          handoff.current = { startIndex: state.currentIndex, length: state.wordList.length };
        }
      } catch (error) {
        console.warn('[BACKGROUND] Could not hand playback to the native service', error);
      }
    };

    const toForeground = async () => {
      const taken = handoff.current;
      if (!taken) return;
      handoff.current = null;
      try {
        const result = await stopBackgroundPlayback();
        const state = latest.current;
        const nextIndex = resolveResumeIndex(taken.startIndex, result.advanced, taken.length);
        if (!result.running || result.paused) {
          // Paused or stopped from the notification: keep the same state in the app.
          state.setIsPaused(true);
          state.setCurrentIndex(nextIndex);
          return;
        }
        if (nextIndex !== state.currentIndex) {
          // The new word is spoken by the normal "word changed" effect.
          state.setCurrentIndex(nextIndex);
        } else {
          window.setTimeout(() => latest.current.playCurrentWord(), 150);
        }
      } catch (error) {
        console.warn('[BACKGROUND] Could not read the native playback position', error);
      }
    };

    void import('@capacitor/app').then(async ({ App }) => {
      if (cancelled) return;
      const listener = await App.addListener('appStateChange', ({ isActive }) => {
        void (isActive ? toForeground() : toBackground());
      });
      if (cancelled) {
        void listener.remove();
        return;
      }
      remove = () => void listener.remove();
    });

    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);
};
