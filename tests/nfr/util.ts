import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const budgets: Record<string, { budget: number; baseline: number }> = JSON.parse(readFileSync(join(process.cwd(), 'tests/nfr/budgets.json'), 'utf8'));
export const SCALE = Number(process.env.NFR_BUDGET_SCALE || 1);
export const RUNS = Number(process.env.NFR_RUNS || 5);
const OUT = process.env.NFR_VITEST_RESULTS || '/workspace/qa/nfr-vitest-results.json';

export const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

/** Time `fn` (ms) `runs` times and return the median. */
export async function timeMedian(fn: () => unknown | Promise<unknown>, runs = RUNS): Promise<number> {
  const t: number[] = [];
  for (let i = 0; i < runs; i++) { const s = performance.now(); await fn(); t.push(performance.now() - s); }
  return median(t);
}
export function heapMB(): number {
  (globalThis as any).gc?.(); (globalThis as any).gc?.();
  return process.memoryUsage().heapUsed / 1048576;
}

const metrics: Record<string, Record<string, number>> = {};
/** Record a metric and assert it is within its budget (key "<id>.<metric>" in tests/nfr/budgets.json); no entry = record only. */
export function check(id: string, metric: string, value: number, { scale = true } = {}) {
  (metrics[id] ||= {})[metric] = round(value, 2);
  try {
    mkdirSync(dirname(OUT), { recursive: true });
    const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
    writeFileSync(OUT, JSON.stringify({ ...prev, [id]: { ...(prev[id] || {}), ...metrics[id] } }, null, 2));
  } catch { /* results file is best effort */ }
  const b = budgets[`${id}.${metric}`];
  if (!b) return;
  const limit = b.budget * (scale ? SCALE : 1);
  if (value > limit) throw new Error(`${id}.${metric} = ${round(value, 2)} exceeds budget ${limit} (baseline ${b.baseline})`);
}
