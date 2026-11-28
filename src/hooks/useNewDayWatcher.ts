import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { NEW_DAY_EVENT } from '@/features/word-sets/todayPlan';
import { localDayKey } from '@/lib/reminders/studySignal';
import { replanNow } from '@/lib/reminders/localReminders';

/** Ms until the next local midnight (+1s so the day key has definitely flipped). */
export function msUntilNextMidnight(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0);
  return Math.max(1000, next.getTime() - now.getTime());
}

/**
 * [FB-74] A process that stays alive across midnight (foreground service, app left in the background, resumed next
 * morning) used to keep yesterday's words, yesterday's frozen Library plan and yesterday's media card. On resume/visible
 * and at local midnight, if the local day changed, start a new day (NEW_DAY_EVENT: clears the frozen plan, reloads
 * today's selection) and re-plan the reminders. Cold start already loads today's selection, so nothing is needed there.
 */
export function useNewDayWatcher(): void {
  useEffect(() => {
    let day = localDayKey();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = () => {
      const now = localDayKey();
      if (now !== day) {
        day = now;
        window.dispatchEvent(new Event(NEW_DAY_EVENT));
        void replanNow();
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(check, msUntilNextMidnight());
    };
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };

    check();
    document.addEventListener('visibilitychange', onVisible);
    let remove: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      void App.addListener('resume', check).then((h) => { remove = () => void h.remove(); }).catch(() => {});
    }
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      remove?.();
    };
  }, []);
}
