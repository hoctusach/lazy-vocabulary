import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { STUDIED_EVENT, type StudyKind } from '@/lib/reminders/studySignal';
import { listenForTaps, maybeAutoAsk, replanNow } from '@/lib/reminders/localReminders';

/** Keeps the on-device reminder schedule fresh: on start/resume, and when the user studies. */
export function useStudyReminders(): void {
  useEffect(() => {
    void listenForTaps();
    void replanNow();

    const onVisible = () => {
      if (document.visibilityState === 'visible') void replanNow();
    };
    const onStudied = (e: Event) => {
      const { kind, first } = (e as CustomEvent<{ kind: StudyKind; first: boolean }>).detail ?? {};
      if (first) void replanNow(); // cancels the rest of today's reminders
      if (kind === 'mark' || kind === 'quiz') void maybeAutoAsk();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(STUDIED_EVENT, onStudied);

    let remove: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      void App.addListener('resume', () => void replanNow()).then((h) => { remove = () => void h.remove(); }).catch(() => {});
    }
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(STUDIED_EVENT, onStudied);
      remove?.();
    };
  }, []);
}
