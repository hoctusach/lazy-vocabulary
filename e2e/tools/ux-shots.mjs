// UX walk-through screenshots: node e2e/tools/ux-shots.mjs <outDir>
// Free user, default theme, 390x844 @2x, fake backend. Uses the already-built E2E_DIST (/tmp/lv-e2e-dist).
import fs from 'node:fs';
import path from 'node:path';
import * as H from '../lib/harness.mjs';
import * as U from '../lib/ui.mjs';

const OUT = process.argv[2] || '/workspace/design/after/ux/after';
fs.mkdirSync(OUT, { recursive: true });
const VIEW = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
await H.setup();
async function shot(name, opts, fn) {
  const s = await H.newSession({ pro: false, viewport: VIEW, ...opts });
  try {
    await s.goto('/'); await H.sleep(2200);
    if (fn) await fn(s);
    await H.sleep(500);
    await s.page.evaluate(() => document.querySelectorAll('[data-sonner-toaster]').forEach((n) => n.remove()));
    await s.page.screenshot({ path: path.join(OUT, name + '.png') });
    console.log('saved', name);
  } catch (e) { console.log('FAILED', name, e.message.slice(0, 200)); } finally { await s.close(); }
}
const tab = (s, n) => U.tab(s, n).then(() => H.sleep(900));
await shot('01-signin', { signedIn: false });
await shot('02-learn');
await shot('03-learn-playing', {}, async (s) => { await s.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^(play|start)/i.test(x.getAttribute('aria-label') || '') || /play/i.test(x.getAttribute('aria-label') || '')); b?.click(); }); await H.sleep(800); });
await shot('04-progress', {}, (s) => tab(s, 'Progress'));
await shot('05-sets', {}, (s) => tab(s, 'Sets'));
await shot('05b-sets-scrolled', {}, async (s) => { await tab(s, 'Sets'); await s.page.evaluate(() => window.scrollTo(0, 99999)); await H.sleep(500); });
await shot('06-more', {}, (s) => tab(s, 'More'));
await shot('06b-more-scrolled', {}, async (s) => { await tab(s, 'More'); await s.page.evaluate(() => window.scrollTo(0, 99999)); await H.sleep(500); });
await shot('07-search', {}, async (s) => { await U.click(s, { labelRe: 'search' }).catch(() => U.click(s, { textHas: 'Search' })); await H.sleep(800); });
await shot('08-quiz', {}, async (s) => { await tab(s, 'Progress'); await U.click(s, { text: 'Quiz me' }); await H.sleep(900); });
await shot('09-controls', {}, async (s) => { await s.page.evaluate(() => window.scrollTo(0, 99999)); await H.sleep(400); });
await H.teardown();
