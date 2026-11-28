// NFR-PERF: browser/build performance. Budgets: tests/nfr/budgets.json (median of NFR_RUNS runs, ~20-30% over baseline).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { test, check, record, warn, median, round, RUNS, heapStats } from '../lib.mjs';
import { skip } from '../../lib/framework.mjs';
import * as H from '../../lib/harness.mjs';
import * as U from '../../lib/ui.mjs';

// Marks the moment (performance.now) the React root mounted and the first card word appeared.
const MARKS = `
  window.__t = {};
  new MutationObserver(() => {
    const t = window.__t;
    if (!t.root && (document.getElementById('root')?.children.length || 0) > 0) t.root = performance.now();
    if (!t.word && document.querySelector('main h1')?.textContent.trim()) t.word = performance.now();
  }).observe(document, { childList: true, subtree: true });
`;

/** One cold start in a fresh (cache-less) context. Returns ms values. */
async function coldStart(session, { cpu = 1 } = {}) {
  const s = await session({ initScript: MARKS });
  const cdp = await s.page.createCDPSession();
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  const t0 = Date.now();
  await s.page.goto(H.baseUrl() + '/', { waitUntil: 'domcontentloaded' });
  await s.page.waitForFunction(() => window.__t && window.__t.word, { timeout: 60000 });
  const wall = Date.now() - t0;
  const m = await s.page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    return { ...window.__t, fcp: fcp ? fcp.startTime : null, dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd };
  });
  // Interactive = the primary control answers: Pause toggles to Play within one frame.
  const t1 = Date.now();
  await U.click(s, { label: 'Pause' }, { wait: 0 });
  await s.page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /^(Play|Resume)$/.test(b.getAttribute('aria-label') || '')), { timeout: 5000 });
  const tap = Date.now() - t1;
  return { ...m, wall, tap };
}

async function series(session, n, opts) {
  const runs = [];
  for (let i = 0; i < n; i++) runs.push(await coldStart(session, opts));
  return runs;
}

test('NFR-PERF-01', 'Cold start: first contentful paint and React root mounted (median of N, fresh context)', async ({ session }) => {
  const runs = await series(session, RUNS);
  check('NFR-PERF-01', 'fcp_ms', median(runs.map((r) => r.fcp ?? r.root)));
  check('NFR-PERF-01', 'root_mounted_ms', median(runs.map((r) => r.root)));
  check('NFR-PERF-01', 'dom_content_loaded_ms', median(runs.map((r) => r.dcl)));
});

test('NFR-PERF-02', 'Learn screen time-to-interactive: first word rendered and Pause responds (median of N)', async ({ session }) => {
  const runs = await series(session, RUNS);
  check('NFR-PERF-02', 'first_word_ms', median(runs.map((r) => r.word)));
  check('NFR-PERF-02', 'pause_tap_ms', median(runs.map((r) => r.tap)));
});

test('NFR-PERF-03', 'Learn time-to-interactive on a slow phone (4x CPU throttle, median of 3)', async ({ session }) => {
  const runs = await series(session, 3, { cpu: 4 });
  check('NFR-PERF-03', 'first_word_ms_4x', median(runs.map((r) => r.word)));
});

// ---- bundle size (no browser): gzip per chunk + totals of the fake-backend production bundle ----
test('NFR-PERF-04', 'JS/CSS bundle size: largest chunk and total, gzip', async () => {
  const dir = path.join(process.env.E2E_DIST, 'assets');
  const rows = fs.readdirSync(dir).filter((f) => /\.(js|css)$/.test(f)).map((f) => {
    const buf = fs.readFileSync(path.join(dir, f));
    return { f, kind: path.extname(f).slice(1), raw: buf.length, gz: zlib.gzipSync(buf, { level: 9 }).length };
  });
  const sum = (k, key) => rows.filter((r) => r.kind === k).reduce((a, r) => a + r[key], 0);
  const biggest = [...rows].filter((r) => r.kind === 'js').sort((a, b) => b.gz - a.gz);
  record('NFR-PERF-04', { chunks: rows.length, top_chunks: biggest.slice(0, 4).map((r) => `${r.f.replace(/-[\w-]{8}\./, '.')}:${round(r.gz / 1024)}KB`) });
  check('NFR-PERF-04', 'js_total_gz_kb', sum('js', 'gz') / 1024, { scale: false });
  check('NFR-PERF-04', 'css_total_gz_kb', sum('css', 'gz') / 1024, { scale: false });
  check('NFR-PERF-04', 'largest_js_chunk_gz_kb', biggest[0].gz / 1024, { scale: false });
  check('NFR-PERF-04', 'index_html_kb', fs.statSync(path.join(process.env.E2E_DIST, 'index.html')).size / 1024, { scale: false });
  // Initial (eagerly loaded) JS = what index.html references; the rest is lazy.
  const html = fs.readFileSync(path.join(process.env.E2E_DIST, 'index.html'), 'utf8');
  const initial = [...html.matchAll(/(?:src|href)="[^"]*\/assets\/([^"]+\.js)"/g)].map((m) => m[1]);
  const init = rows.filter((r) => initial.includes(r.f)).reduce((a, r) => a + r.gz, 0);
  check('NFR-PERF-04', 'initial_js_gz_kb', init / 1024, { scale: false });
});

// ---- AAB size: set NFR_AAB_PATH=/path/to/app-release.aab (skipped when absent) ----
const AAB = process.env.NFR_AAB_PATH;
if (AAB && fs.existsSync(AAB)) {
  test('NFR-PERF-05', 'AAB size stays under the warn threshold (1.0.7 was ~75.7 MB)', async () => {
    const mb = fs.statSync(AAB).size / 1048576;
    check('NFR-PERF-05', 'aab_mb', mb, { scale: false });
    if (mb > 80) warn('NFR-PERF-05', `AAB is ${round(mb)} MB (warn threshold 80 MB, hard budget in budgets.json)`);
  });
} else skip('NFR-PERF-05', 'AAB size under warn threshold', 'set NFR_AAB_PATH to an AAB file to enable');

// ---- memory-leak check over a long session ----
test('NFR-PERF-09', 'Long session: 100 next-word cycles, JS heap / DOM nodes / listeners growth after GC', async ({ session }) => {
  const s = await session();
  await U.boot(s);
  const next = () => s.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Next Word' && x.offsetParent); b.click(); });
  for (let i = 0; i < 15; i++) { await next(); await H.sleep(25); }   // warm-up: lazy chunks, caches
  const before = await heapStats(s.page);
  const words = new Set();
  for (let i = 0; i < 100; i++) { await next(); await H.sleep(25); words.add(await U.word(s)); }
  await H.sleep(300);
  const after = await heapStats(s.page);
  record('NFR-PERF-09', { heap_before_mb: round(before.heapMB), heap_after_mb: round(after.heapMB), distinct_words: words.size });
  check('NFR-PERF-09', 'heap_growth_mb', after.heapMB - before.heapMB, { scale: false });
  check('NFR-PERF-09', 'dom_node_growth', after.nodes - before.nodes, { scale: false });
  check('NFR-PERF-09', 'listener_growth', after.listeners - before.listeners, { scale: false });
});
