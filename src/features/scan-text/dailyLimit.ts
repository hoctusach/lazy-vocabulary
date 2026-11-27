import { getLocalDateISO } from '@/utils/date';

/** [FB-66] Free users get this many successful scans per device-local calendar day; Pro is unlimited. */
export const FREE_SCANS_PER_DAY = 5;
const KEY = 'lazyVoca.scan.daily.v1';

export function scansToday(now: Date = new Date()): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const p = JSON.parse(raw) as { date?: unknown; count?: unknown };
    if (p.date === getLocalDateISO(now) && typeof p.count === 'number') return p.count;
  } catch {
    /* unreadable / blocked storage: no scans yet */
  }
  return 0;
}

export function scansLeftToday(unlimited: boolean, now: Date = new Date()): number {
  return unlimited ? Infinity : Math.max(0, FREE_SCANS_PER_DAY - scansToday(now));
}

export function canScan(unlimited: boolean, now: Date = new Date()): boolean {
  return unlimited || scansToday(now) < FREE_SCANS_PER_DAY;
}

/** Count one scan. Call only after OCR actually succeeded (never for a cancelled camera). */
export function recordScan(now: Date = new Date()): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ date: getLocalDateISO(now), count: scansToday(now) + 1 }));
  } catch {
    /* ignore storage failures */
  }
}
