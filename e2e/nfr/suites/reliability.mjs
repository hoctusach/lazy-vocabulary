// NFR-REL: offline, slow network, unreachable backend. Fake backend only; nothing leaves localhost.
import { test, check, record, median, round, startGzipServer } from '../lib.mjs';
import { createFake } from '../../lib/fake.mjs';
import * as H from '../../lib/harness.mjs';
import * as U from '../../lib/ui.mjs';
const { ok, tab } = U;

const NET_NOISE = [/Failed to load resource/, /Failed to fetch|NetworkError|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_FAILED|net::|timed out|503/i];
const cardWord = (s) => s.page.evaluate(() => document.querySelector('main h1')?.textContent.trim() || '');
const waitAnyWord = (s, ms = 20000) => s.page.waitForFunction(() => !!document.querySelector('main h1')?.textContent.trim(), { timeout: ms });

async function nextWords(s, n) {
  const seen = [];
  for (let i = 0; i < n; i++) {
    await U.click(s, { label: 'Next Word' }, { wait: 120 }); seen.push(await cardWord(s));
  }
  return seen;
}
async function sweepTabs(s) {
  for (const t of ['Progress', 'Library', 'More', 'Learn']) {
    await tab(s, t); await H.sleep(300);
    ok(await s.page.evaluate(() => document.body.innerText.trim().length > 20), `${t} tab is blank`);
  }
}

test('NFR-REL-01', 'Offline mid-session: app keeps working (tabs, next word, pause), no uncaught errors, no blank screen', async ({ session }) => {
  const s = await session({ allow: NET_NOISE });
  s.allow.push(...NET_NOISE);
  await U.boot(s);
  await s.page.setOfflineMode(true);
  await H.sleep(300);
  const seen = await nextWords(s, 5);
  ok(seen.every(Boolean) && new Set(seen).size > 1, `words advance offline: ${JSON.stringify(seen)}`);
  await sweepTabs(s);
  await U.click(s, { label: 'Pause' });
  await s.page.setOfflineMode(false);
  await sweepTabs(s);
});

// The web build has no service worker, so a truly offline browser cannot even load the page; the installed app serves
// the bundle from the device. Emulate that: bundle from localhost, navigator.onLine=false, every backend call fails.
test('NFR-REL-02', 'Cold start offline like the installed app (onLine=false, backend unreachable): first word appears, time-to-word measured', async ({ session }) => {
  const times = [];
  for (let i = 0; i < 3; i++) {
    const s = await session({ fake: { mode: 'down' }, allow: NET_NOISE, initScript: `Object.defineProperty(navigator, 'onLine', { get: () => false });` });
    s.allow.push(...NET_NOISE);
    const t0 = Date.now();
    await s.goto('/'); await waitAnyWord(s);
    times.push(Date.now() - t0);
    await H.sleep(700);   // the card may re-render once when the local fallback settles
    ok((await cardWord(s)).length > 0, `card has a word (body: ${(await U.body(s)).slice(0, 120).replace(/\n+/g, ' / ')})`);
    await nextWords(s, 3); await sweepTabs(s);
  }
  check('NFR-REL-02', 'offline_first_word_ms', median(times));
});

test('NFR-REL-03', 'Slow 3G (500 kbps, 400 ms RTT, gzip like a real host): web cold start to first word', async ({ session }) => {
  const gz = await startGzipServer(process.env.E2E_DIST);
  try {
    const s = await session({ initScript: `window.__tw = 0; new MutationObserver(() => { if (!window.__tw && document.querySelector('main h1')?.textContent.trim()) window.__tw = performance.now(); }).observe(document, { childList: true, subtree: true });` });
    const c = await s.page.createCDPSession();
    await c.send('Network.enable');
    await c.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: (500 * 1024) / 8, uploadThroughput: (500 * 1024) / 8 });
    await s.page.goto(gz.base + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await s.page.waitForFunction(() => window.__tw > 0, { timeout: 90000 });
    const ms = await s.page.evaluate(() => window.__tw);
    const bytes = await s.page.evaluate(() => performance.getEntriesByType('resource').reduce((a, r) => a + (r.encodedBodySize || 0), 0));
    record('NFR-REL-03', { transferred_kb: round(bytes / 1024) });
    check('NFR-REL-03', 'slow3g_first_word_ms', ms);
  } finally { await gz.close(); }
}, { timeout: 150000 });

function hostile(kind) {
  const f = createFake({});
  const base = f.handle;
  f.handle = (url, method, post, headers) => {
    if (method === 'OPTIONS') return base(url, method, post, headers);
    if (kind === 'abort') return 'abort';
    if (kind === 'hang') return 'hang';
    return { status: 503, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: '{"message":"upstream unavailable"}' };
  };
  return f;
}
for (const kind of ['abort', '503', 'hang']) {
  test(`NFR-REL-04-${kind}`, `${kind === 'hang' ? '[FB-83] ' : ''}Supabase unreachable (${kind}): signed-in user still gets a card from local data, can advance and browse, within budget`, async ({ session }) => {
    const s = await session({ fakeInstance: hostile(kind), allow: NET_NOISE });
    s.allow.push(...NET_NOISE);
    const t0 = Date.now();
    await s.goto('/'); await waitAnyWord(s, 25000);
    const ms = Date.now() - t0;
    check(`NFR-REL-04-${kind}`, 'first_word_ms', ms);
    const seen = await nextWords(s, 4);
    ok(seen.every(Boolean), `words advance: ${JSON.stringify(seen)}`);
    await sweepTabs(s);
    const body = await U.body(s);
    ok(!/Something went wrong|Application error|Unexpected/i.test(body), 'no crash screen');
  }, { timeout: 90000 });
}
