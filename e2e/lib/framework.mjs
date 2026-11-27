import * as H from './harness.mjs';

export const registry = [];
/** test(id, title, fn, { skip: 'reason', allow: [/regex/], opts }) */
export function test(id, title, fn, o = {}) { registry.push({ id, title, fn, ...o }); }
export function skip(id, title, reason) { registry.push({ id, title, skip: reason }); }

const NOISE = [/^console\.error: Failed to load resource/]; // browser's own log line for faked 4xx / blocked analytics

export async function runOne(t) {
  if (t.skip) return { id: t.id, title: t.title, status: 'skip', error: t.skip };
  const sessions = [];
  const ctx = {
    session: async (opts = {}) => { const s = await H.newSession({ ...(t.opts || {}), ...opts }); s.allow = [...NOISE, ...(t.allow || []), ...(opts.allow || [])]; sessions.push(s); return s; },
  };
  const timeout = t.timeout || 60000;
  let timer;
  try {
    await Promise.race([
      t.fn(ctx),
      new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`timeout after ${timeout}ms`)), timeout); }),
    ]);
    if (!t.noErrorCheck) {
      for (const s of sessions) {
        const rej = (await s.rejections()).filter((r) => !s.allow.some((re) => re.test(r)));
        const errs = s.errors.filter((e) => !s.allow.some((re) => re.test(e)));
        if (errs.length || rej.length) throw new Error('uncaught: ' + [...errs, ...rej.map((r) => 'unhandledrejection: ' + r)].join(' | ').slice(0, 800));
        const empty = await s.page.evaluate(() => (document.getElementById('root')?.children.length || 0) === 0).catch(() => false);
        if (empty) throw new Error('#root empty at end of test');
      }
    }
    return { id: t.id, title: t.title, status: 'pass' };
  } catch (e) {
    for (const [i, s] of sessions.entries()) {
      try { await s.page.screenshot({ path: `/tmp/e2e-fail-${t.id.replace(/\W/g, '_')}-${i}.png` }); } catch {}
    }
    return { id: t.id, title: t.title, status: 'fail', error: String(e && e.message || e).slice(0, 1500) };
  } finally {
    clearTimeout(timer);
    await Promise.all(sessions.map((s) => s.close()));
  }
}
