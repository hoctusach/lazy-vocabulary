import { useEffect, useState, useCallback } from 'react';

type HoursByDate = Record<string, number>;

function getStorageKey(id: string) {
  return `learningTime_${id}`;
}

export function useLearnerHours(learnerId: string) {
  const [totalHours, setTotalHours] = useState(0);
  const [hoursByDate, setHoursByDate] = useState<HoursByDate>({});

  const load = useCallback(() => {
    try {
      const raw = localStorage.getItem(getStorageKey(learnerId));
      const record: Record<string, number> = raw ? JSON.parse(raw) : {};
      const byDate: HoursByDate = {};
      let total = 0;
      Object.entries(record).forEach(([date, ms]) => {
        const hours = ms / (1000 * 60 * 60);
        byDate[date] = hours;
        total += hours;
      });
      setHoursByDate(byDate);
      setTotalHours(total);
    } catch {
      setHoursByDate({});
      setTotalHours(0);
    }
  }, [learnerId]);

  useEffect(() => {
    load();
    const fetchTotal = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      try {
        const res = await fetch(`/api/learning-time/total/${encodeURIComponent(learnerId)}`);
        if (res.ok) {
          const data = await res.json();
          if (typeof data.totalHours === 'number') {
            setTotalHours(data.totalHours);
          }
        }
      } catch { /* ignore */ }
    };
    void fetchTotal();
    const handler = (e: StorageEvent) => {
      if (e.key === getStorageKey(learnerId)) {
        load();
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [learnerId, load]);

  return { totalHours, hoursByDate };
}

export default useLearnerHours;
