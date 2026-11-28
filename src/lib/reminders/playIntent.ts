/**
 * [FB-74] "Play" action on the daily reminder notification. The tap is the user's explicit request to start today's
 * playback. It may arrive before the app has loaded (cold start: Capacitor retains the action until a listener is
 * registered), so it is stored here and consumed once today's words are ready. Expires so a stale tap never starts
 * playback later by surprise.
 */
export const PLAY_INTENT_EVENT = 'lv:play-today';
export const PLAY_INTENT_TTL_MS = 3 * 60_000;

let requestedAt: number | null = null;

export function requestPlayToday(now: number = Date.now()): void {
  requestedAt = now;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PLAY_INTENT_EVENT));
}

export function hasPlayIntent(now: number = Date.now()): boolean {
  return requestedAt !== null && now - requestedAt <= PLAY_INTENT_TTL_MS;
}

/** True exactly once per request (and only while it is fresh). */
export function consumePlayIntent(now: number = Date.now()): boolean {
  const ok = hasPlayIntent(now);
  requestedAt = null;
  return ok;
}
