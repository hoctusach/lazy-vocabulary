import { upsertLearningTime } from './pushers';

/**
 * Flushes locally cached daily learning time to the server.
 * Reads all localStorage keys of the form `dailyTime_<YYYY-MM-DD>` and upserts
 * them via `upsertLearningTime` for the given nickname.
 */
export async function flushLocalToServer(nickname: string) {
  if (!nickname) return;
  const rows: Array<{ dayISO: string; duration_ms: number }> = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('dailyTime_')) {
        const ms = Number(localStorage.getItem(key) || '0');
        if (ms > 0) {
          const day = key.slice('dailyTime_'.length);
          rows.push({ dayISO: `${day}T00:00:00.000Z`, duration_ms: ms });
        }
      }
    }
  } catch {}
  if (rows.length) {
    try { await upsertLearningTime(nickname, rows); } catch {}
  }
}
