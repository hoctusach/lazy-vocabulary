import { useEffect, useRef } from 'react';
import { addStreakDay } from '@/utils/streak';

const STICKERS_KEY = 'stickers';
const MINUTES_15 = 15 * 60 * 1000;

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getTodayKey() {
  return `dailyTime_${formatDate(new Date())}`;
}

export const useDailyUsageTracker = () => {
  const sessionStart = useRef<number | null>(null);
  // Tracks accumulated time for the current day across all sessions
  const dailyTotal = useRef<number>(0);

  const loadDailyTotal = () => {
    const key = getTodayKey();
    dailyTotal.current = parseInt(localStorage.getItem(key) || '0', 10);
  };

  const saveDailyTotal = () => {
    const key = getTodayKey();
    localStorage.setItem(key, dailyTotal.current.toString());
  };

  const awardStickerIfNeeded = () => {
    if (dailyTotal.current < MINUTES_15) return;
    try {
      const today = formatDate(new Date());
      const stickers: string[] = JSON.parse(localStorage.getItem(STICKERS_KEY) || '[]');
      if (!stickers.includes(today)) {
        stickers.push(today);
        localStorage.setItem(STICKERS_KEY, JSON.stringify(stickers));
        addStreakDay(today);
      }
    } catch (err) {
      console.error('Failed to update stickers', err);
    }
  };

  const startSession = () => {
    if (sessionStart.current === null) {
      sessionStart.current = Date.now();
    }
  };

  const stopSession = () => {
    if (sessionStart.current === null) return;
    const duration = Date.now() - sessionStart.current;
    sessionStart.current = null;

    // Accumulate today's total usage time
    dailyTotal.current += duration;
    saveDailyTotal();
    awardStickerIfNeeded();
  };

  useEffect(() => {
    loadDailyTotal();
    awardStickerIfNeeded();
    startSession();

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stopSession();
      } else if (document.visibilityState === 'visible') {
        startSession();
      }
    };

    window.addEventListener('beforeunload', stopSession);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopSession();
      window.removeEventListener('beforeunload', stopSession);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
};

export { formatDate };
