import { DAILY_TARGET, MAX_TOTAL } from '@/lib/progress/dailyTarget';

/**
 * [FB-63] Splitting a new day's ~20 words across the SELECTED sources (built-in groups and imported sets) in
 * proportion to their sizes. Pure functions: no storage, no clock.
 */
export interface MixSource {
  id: string;
  /** Words in the source (its size). */
  size: number;
  /** Due reviews waiting in the source (a tiny set with due words still gets a slot). */
  due?: number;
}

/**
 * Slots per source, summing to `total` (or less when the sources hold fewer words). Largest-remainder rounding on the
 * size share; a non-empty source with Due words gets at least one slot; no source gets more than it holds.
 * One source gets everything (up to `total`).
 */
export function allocateQuotas(sources: readonly MixSource[], total: number = DAILY_TARGET): Record<string, number> {
  const cap = Math.max(0, Math.min(Math.trunc(total) || 0, MAX_TOTAL));
  const live = sources.filter((s) => s.size > 0);
  const out: Record<string, number> = {};
  for (const s of sources) out[s.id] = 0;
  if (live.length === 0 || cap === 0) return out;
  if (live.length === 1) {
    out[live[0].id] = Math.min(cap, live[0].size);
    return out;
  }
  const sum = live.reduce((acc, s) => acc + s.size, 0);
  const shares = live.map((s) => ({ s, exact: (cap * s.size) / sum }));
  shares.forEach(({ s, exact }) => { out[s.id] = Math.min(Math.floor(exact), s.size); });
  // a tiny set with Due words still contributes
  for (const { s } of shares) {
    if (out[s.id] === 0 && (s.due ?? 0) > 0) out[s.id] = 1;
  }
  let used = live.reduce((acc, s) => acc + out[s.id], 0);
  // hand out the rest by largest remainder, then by size, respecting each source's capacity
  const order = [...shares].sort((a, b) => (b.exact % 1) - (a.exact % 1) || b.s.size - a.s.size);
  for (let guard = 0; used < cap && guard < cap * live.length + live.length; guard += 1) {
    const next = order[guard % order.length].s;
    if (out[next.id] < next.size) { out[next.id] += 1; used += 1; }
    else if (live.every((s) => out[s.id] >= s.size)) break;
  }
  // over the cap (minimum-slot rule): take from the largest source
  while (used > cap) {
    const biggest = [...live].sort((a, b) => out[b.id] - out[a.id])[0];
    if (out[biggest.id] <= 1) break;
    out[biggest.id] -= 1; used -= 1;
  }
  return out;
}

export interface QuotaList<T> {
  id: string;
  /** The source's words, Due first then New (the order is kept). */
  words: readonly T[];
}

/**
 * Per-source picks for today: each source gives up to its quota (Due first, as listed); slots a source cannot fill go to
 * the other sources in order. Total <= `total` (never above MAX_TOTAL).
 */
export function takeByQuota<T>(lists: readonly QuotaList<T>[], quotas: Record<string, number>, total: number = DAILY_TARGET): Record<string, T[]> {
  const cap = Math.max(0, Math.min(Math.trunc(total) || 0, MAX_TOTAL));
  const taken = lists.map((l) => ({ id: l.id, words: l.words.slice(0, quotas[l.id] ?? 0), rest: l.words.slice(quotas[l.id] ?? 0) }));
  let used = taken.reduce((acc, t) => acc + t.words.length, 0);
  for (const t of taken) {
    if (used >= cap) break;
    const add = t.rest.slice(0, cap - used);
    t.words = [...t.words, ...add];
    used += add.length;
  }
  const out: Record<string, T[]> = {};
  for (const t of taken) out[t.id] = t.words;
  return out;
}

/** {@link takeByQuota} flattened round-robin so the sources mix while playing. */
export function pickByQuota<T>(lists: readonly QuotaList<T>[], quotas: Record<string, number>, total: number = DAILY_TARGET): T[] {
  const per = takeByQuota(lists, quotas, total);
  const out: T[] = [];
  const longest = Math.max(0, ...lists.map((l) => per[l.id].length));
  for (let i = 0; i < longest; i += 1) {
    for (const l of lists) if (i < per[l.id].length) out.push(per[l.id][i]);
  }
  return out.slice(0, Math.max(0, Math.min(Math.trunc(total) || 0, MAX_TOTAL)));
}
