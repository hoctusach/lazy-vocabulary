// Shared helpers for the NFR (non-functional) suites. Reuses the e2e harness (puppeteer-core, fake Supabase backend).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test as baseTest } from '../lib/framework.mjs';
import { Assert } from '../lib/ui.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');
export const BUDGETS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/nfr/budgets.json'), 'utf8'));
// Wall-clock budgets can be relaxed on a slower box without editing the file: NFR_BUDGET_SCALE=1.5
export const SCALE = Number(process.env.NFR_BUDGET_SCALE || 1);
export const RUNS = Number(process.env.NFR_RUNS || 5);

/** Metrics written by the tests, dumped into the results JSON next to pass/fail. */
export const METRICS = {};
export const WARNINGS = [];
export const record = (id, o) => { METRICS[id] = { ...(METRICS[id] || {}), ...o }; };
export const warn = (id, msg) => { WARNINGS.push(`${id}: ${msg}`); console.log(`WARN ${id}: ${msg}`); };

export const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

/** Record a value and fail if it is above its budget (tests/nfr/budgets.json, key "<id>.<metric>"). Missing budget = record only. */
export function check(id, metric, value, { scale = true } = {}) {
  record(id, { [metric]: round(value, 2) });
  const b = BUDGETS[`${id}.${metric}`];
  if (!b) return;
  const limit = b.budget * (scale ? SCALE : 1);
  if (value > limit) throw new Assert(`${id}.${metric} = ${round(value, 2)} exceeds budget ${limit} (baseline ${b.baseline})`);
}

/** test(id, title, fn, { known: 'reason' }): a failing known-issue test is reported as KNOWN (listed in the catalog), not as a failure. */
export function test(id, title, fn, o = {}) { baseTest(id, title, fn, { timeout: 120000, ...o }); }

export const DEVICES = [
  { key: 'android-small', label: 'Small Android 360x640', w: 360, h: 640, dsf: 3, mobile: true, ua: 'android' },
  { key: 'pixel7', label: 'Pixel 7 412x915', w: 412, h: 915, dsf: 2.625, mobile: true, ua: 'android' },
  { key: 'android-large', label: 'Large Android phone 480x1040', w: 480, h: 1040, dsf: 3, mobile: true, ua: 'android' },
  { key: 'android-tablet', label: 'Android tablet 800x1280', w: 800, h: 1280, dsf: 2, mobile: true, ua: 'android', known: 'FINDING-1: 768-815px wide tablets: Learn stack is wider than the viewport, action buttons are cut off at the right edge' },
  { key: 'iphone-se', label: 'iPhone SE 375x667', w: 375, h: 667, dsf: 2, mobile: true, ua: 'iphone' },
  { key: 'iphone-13', label: 'iPhone 13 390x844', w: 390, h: 844, dsf: 3, mobile: true, ua: 'iphone' },
  { key: 'ipad-9in', label: 'iPad 9.7in portrait 768x1024', w: 768, h: 1024, dsf: 2, mobile: false, ua: 'ipad', known: 'FINDING-1: 768-815px wide tablets: Learn stack is wider than the viewport, action buttons are cut off at the right edge' },
  { key: 'ipad-portrait', label: 'iPad portrait 820x1180', w: 820, h: 1180, dsf: 2, mobile: false, ua: 'ipad' },
  { key: 'ipad-landscape', label: 'iPad landscape 1180x820', w: 1180, h: 820, dsf: 2, mobile: false, ua: 'ipad' },
];
const UAS = {
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
};
export const viewportOf = (d) => ({ width: d.w, height: d.h, deviceScaleFactor: d.dsf, isMobile: d.mobile, hasTouch: true });
export const uaOf = (d) => UAS[d.ua];

/** axe-core source, injected into the page (free, MIT). Resolved from node_modules. */
export const AXE_SRC = () => fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

/** Static server over the built bundle that gzips text assets like a real host (the shared e2e server does not). */
export function startGzipServer(dir) {
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let file = path.join(dir, decodeURIComponent(url.pathname));
    if (!file.startsWith(dir)) { res.writeHead(403); return res.end(); }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      const ext = path.extname(url.pathname);
      if (ext && ext !== '.html') { res.writeHead(404); return res.end(); }
      file = path.join(dir, 'index.html');
    }
    const ext = path.extname(file);
    const headers = { 'content-type': TYPES[ext] || 'application/octet-stream' };
    const raw = fs.readFileSync(file);
    if (['.html', '.js', '.css', '.json', '.svg'].includes(ext)) { headers['content-encoding'] = 'gzip'; res.writeHead(200, headers); return res.end(zlib.gzipSync(raw)); }
    res.writeHead(200, headers); res.end(raw);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ base: `http://localhost:${server.address().port}`, close: () => new Promise((r) => server.close(r)) })));
}

/** Heap + DOM numbers after a forced GC, via CDP. */
export async function heapStats(page) {
  const c = await page.createCDPSession();
  try {
    await c.send('HeapProfiler.enable');
    await c.send('HeapProfiler.collectGarbage'); await c.send('HeapProfiler.collectGarbage');
    await c.send('Performance.enable');
    const { metrics } = await c.send('Performance.getMetrics');
    const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));
    return { heapMB: m.JSHeapUsedSize / 1048576, nodes: m.Nodes, listeners: m.JSEventListeners };
  } finally { await c.detach().catch(() => {}); }
}
