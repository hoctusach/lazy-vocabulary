import { useEffect, useRef } from 'react';
import { ensureUserKey } from '@/lib/progress/srsSyncByUserKey';
import { ensureLearnedDay, setLearningTimeForDay } from '@/lib/progress/progressSummary';
import { trackSessionEnd, trackSessionStart } from '@/services/analyticsService';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getLocalMs(key: string): number {
  try {
    return Number(localStorage.getItem(`dailyTime_${key}`) || '0');
  } catch {
    return 0;
  }
}

function setLocalMs(key: string, ms: number) {
  try {
    localStorage.setItem(`dailyTime_${key}`, String(Math.max(0, Math.floor(ms))));
  } catch {
    // ignore storage errors
  }
}

async function persistLearningTime(
  userKeyRef: React.MutableRefObject<string | null>,
  dayKey: string,
  ms: number
) {
  const safeDay = dayKey.slice(0, 10);
  if (!safeDay) return;

  if (!userKeyRef.current) {
    userKeyRef.current = await ensureUserKey();
  }
  const userKey = userKeyRef.current;
  if (!userKey) return;

  try {
    await setLearningTimeForDay(userKey, safeDay, ms);
  } catch (error) {
    console.warn('[useDailyUsageTracker] Failed to persist learning time', error);
  }
}

async function ensureTrackedDay(
  userKeyRef: React.MutableRefObject<string | null>,
  dayKey: string
) {
  const safeDay = dayKey.slice(0, 10);
  if (!safeDay) return;

  if (!userKeyRef.current) {
    userKeyRef.current = await ensureUserKey();
  }
  const userKey = userKeyRef.current;
  if (!userKey) return;

  try {
    await ensureLearnedDay(userKey, safeDay);
  } catch (error) {
    console.warn('[useDailyUsageTracker] Failed to ensure learned day', error);
  }
}

/**
 * Tracks active time in the app and mirrors totals into user_progress_summary.
 * Preferences remain in localStorage; Supabase is only updated when a key exists.
 */
export function useDailyUsageTracker() {
  const lastTs = useRef<number | null>(null);
  const keyRef = useRef<string>(todayKey());
  const memMs = useRef<number>(getLocalMs(keyRef.current));
  const sessionBaselineMs = useRef<number>(memMs.current);
  const sessionStartedRef = useRef(false);
  const userKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const captureElapsed = () => {
      if (lastTs.current == null) return;
      const now = performance.now();
      const delta = now - lastTs.current;
      memMs.current += delta;
      lastTs.current = document.visibilityState === 'visible' ? now : null;
    };

    const persistTotals = () => {
      setLocalMs(keyRef.current, memMs.current);
      void persistLearningTime(userKeyRef, keyRef.current, memMs.current);
    };

    const endSession = () => {
      if (!sessionStartedRef.current) return;
      const userKey = userKeyRef.current;
      if (!userKey) return;

      const durationMs = Math.max(memMs.current - sessionBaselineMs.current, 0);
      const durationSec = Math.round(durationMs / 1000);
      trackSessionEnd(userKey, durationSec);
      sessionBaselineMs.current = memMs.current;
      sessionStartedRef.current = false;
    };

    const startSession = () => {
      const userKey = userKeyRef.current;
      if (!userKey || sessionStartedRef.current) return;

      sessionBaselineMs.current = memMs.current;
      trackSessionStart(userKey);
      sessionStartedRef.current = true;
    };

    void (async () => {
      await ensureTrackedDay(userKeyRef, keyRef.current);
      await persistLearningTime(userKeyRef, keyRef.current, memMs.current);
      startSession();
    })();

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        lastTs.current = performance.now();
        startSession();
        return;
      }

      captureElapsed();
      persistTotals();
      endSession();
    };

    const onTick = () => {
      if (document.visibilityState !== 'visible') return;

      const currentDay = todayKey();
      if (currentDay !== keyRef.current) {
        captureElapsed();
        persistTotals();
        endSession();

        keyRef.current = currentDay;
        memMs.current = getLocalMs(currentDay);
        sessionBaselineMs.current = memMs.current;
        lastTs.current = performance.now();
        void ensureTrackedDay(userKeyRef, currentDay);
        void persistLearningTime(userKeyRef, currentDay, memMs.current);
        startSession();
        return;
      }

      if (lastTs.current == null) {
        lastTs.current = performance.now();
        return;
      }

      const now = performance.now();
      const delta = now - lastTs.current;
      lastTs.current = now;

      memMs.current += delta;
      if (memMs.current % 15_000 < delta) {
        setLocalMs(keyRef.current, memMs.current);
      }
    };

    const interval = window.setInterval(onTick, 5000);
    document.addEventListener('visibilitychange', onVisible);

    const finalizeSession = () => {
      captureElapsed();
      persistTotals();
      endSession();
    };

    window.addEventListener('pagehide', finalizeSession);
    window.addEventListener('beforeunload', finalizeSession);

    onVisible();
    onTick();

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', finalizeSession);
      window.removeEventListener('beforeunload', finalizeSession);
    };
  }, []);
}
