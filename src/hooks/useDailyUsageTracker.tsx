import { useEffect, useRef } from 'react';

// Optional server pushers (keep if present)
let upsertLearningTime: (name: string, rows: Array<{ dayISO: string; duration_ms: number }>) => Promise<any>;
import('../lib/sync/pushers').then(m => { if (m?.upsertLearningTime) upsertLearningTime = m.upsertLearningTime; }).catch(()=>{});

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}
function getLocalMs(key: string): number {
  try { return Number(localStorage.getItem(`dailyTime_${key}`) || '0'); } catch { return 0; }
}
function setLocalMs(key: string, ms: number) {
  try { localStorage.setItem(`dailyTime_${key}`, String(Math.max(0, Math.floor(ms)))); } catch {}
}
async function pushServer(nickname: string, key: string, ms: number) {
  if (!upsertLearningTime || !nickname) return;
  try {
    await upsertLearningTime(nickname, [{ dayISO: `${key}T00:00:00.000Z`, duration_ms: ms }]);
  } catch {}
}

/**
 * Tracks active time in the app:
 * - accumulates ms into localStorage key: dailyTime_<YYYY-MM-DD>
 * - on unload/visibility change/timer tick, writes locally
 * - occasionally upserts to server (if nickname exists)
 */
export function useDailyUsageTracker() {
  const lastTs = useRef<number | null>(null);
  const keyRef = useRef<string>(todayKey());
  const memMs = useRef<number>(getLocalMs(keyRef.current));
  const nickRef = useRef<string | null>(null);

  useEffect(() => {
    try { nickRef.current = localStorage.getItem('lazyVoca.nickname'); } catch {}

    const onVisible = () => { lastTs.current = document.visibilityState === 'visible' ? performance.now() : null; };
    const onTick = () => {
      // if not visible, don't count
      if (document.visibilityState !== 'visible') return;

      // new day rollover?
      const curKey = todayKey();
      if (curKey !== keyRef.current) {
        // flush old day to local (and server) then switch
        setLocalMs(keyRef.current, memMs.current);
        if (nickRef.current) pushServer(nickRef.current, keyRef.current, memMs.current);
        keyRef.current = curKey;
        memMs.current = getLocalMs(curKey);
        lastTs.current = performance.now();
        return;
      }

      if (lastTs.current == null) {
        lastTs.current = performance.now();
        return;
      }

      const now = performance.now();
      const delta = now - lastTs.current;
      lastTs.current = now;

      // accumulate
      memMs.current += delta;
      // write locally every ~15s worth of accumulation (delta tolerance)
      if (memMs.current % 15000 < delta) setLocalMs(keyRef.current, memMs.current);
    };

    // timers & listeners
    const iv = window.setInterval(onTick, 5000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('beforeunload', () => {
      setLocalMs(keyRef.current, memMs.current);
      if (nickRef.current) pushServer(nickRef.current, keyRef.current, memMs.current);
    });

    // initial mark
    onVisible();
    onTick();

    return () => {
      window.clearInterval(iv);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}

