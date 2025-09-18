import { useEffect, useRef } from 'react';
import { ensureUserKey } from '@/lib/progress/srsSyncByUserKey';
import { ensureLearnedDay, setLearningTimeForDay } from '@/lib/progress/progressSummary';

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
  const userKeyRef = useRef<string | null>(null);

  useEffect(() => {
    void (async () => {
      await ensureTrackedDay(userKeyRef, keyRef.current);
      await persistLearningTime(userKeyRef, keyRef.current, memMs.current);
    })();

    const onVisible = () => {
      lastTs.current = document.visibilityState === 'visible' ? performance.now() : null;
    };

    const onTick = () => {
      if (document.visibilityState !== 'visible') return;

      const currentDay = todayKey();
      if (currentDay !== keyRef.current) {
        setLocalMs(keyRef.current, memMs.current);
        void persistLearningTime(userKeyRef, keyRef.current, memMs.current);

        keyRef.current = currentDay;
        memMs.current = getLocalMs(currentDay);
        lastTs.current = performance.now();
        void ensureTrackedDay(userKeyRef, currentDay);
        void persistLearningTime(userKeyRef, currentDay, memMs.current);
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

    window.addEventListener('beforeunload', () => {
      setLocalMs(keyRef.current, memMs.current);
      void persistLearningTime(userKeyRef, keyRef.current, memMs.current);
    });

    onVisible();
    onTick();

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
