// Store screenshots: node e2e/tools/store-screenshots.mjs [outDir]
// Uses the E2E harness (fake backend, no network) with a 360x640 @3x viewport -> 1080x1920 PNGs.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as H from '../lib/harness.mjs';

const OUT = process.argv.slice(2).find((a) => !a.startsWith('--')) || '/workspace/release/listing/screenshots';
const DIST = process.env.E2E_DIST || '/tmp/lv-shots-dist';
process.env.E2E_DIST = DIST;
if (!fs.existsSync(path.join(DIST, 'index.html')) || process.argv.includes('--build')) {
  const r = spawnSync('npx', ['vite', 'build', '--outDir', DIST, '--emptyOutDir'], { stdio: 'inherit',
    env: { ...process.env, VITE_SUPABASE_URL: 'http://fake-supabase.test', VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiJ9.e30.dummy', VITE_GA_MEASUREMENT_ID: 'disabled' } });
  if (r.status !== 0) process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });
const vocab = JSON.parse(fs.readFileSync(new URL('../../src/data/defaultVocabulary.json', import.meta.url)));
const pick = (cat, words) => words.map((w) => vocab[cat].find((e) => e.word.toLowerCase().startsWith(w))).filter(Boolean);
const pool = [
  ...pick('topic vocab', ['ubiquitous', 'meticulous', 'resilien', 'pragmatic', 'ambiguous']),
  ...pick('idioms', ['bite the bullet', 'a blessing in disguise']),
  ...pick('phrasal verbs', ['come up with', 'put off']),
].map((e) => ({ word: e.word, category: e.category || 'topic vocab', meaning: e.meaning, example: e.example, translation: e.translation }));
if (pool.length < 4) pool.push(...vocab['topic vocab'].slice(40, 48));
const days = []; for (let i = 0; i < 12; i++) days.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
const lb = [];
const users = [['minhanh', 412, 38], ['tram', 268, 24], ['tuan.ielts', 233, 30], ['linh', 190, 12], ['quang', 95, 20]];
for (const [u, learned, learning] of users) {
  for (let i = 0; i < learned; i++) lb.push({ user_unique_key: u, srs_state: 'learned', in_review_queue: false, next_review_at: null });
  for (let i = 0; i < learning; i++) lb.push({ user_unique_key: u, srs_state: 'learning', in_review_queue: true, next_review_at: new Date(Date.now() + (i % 3 ? 864e5 : -36e5)).toISOString() });
}
const VIEW = { width: 360, height: 640, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
await H.setup();
async function shot(name, { theme = 'ocean', tab = null, lang = 'en-US', after } = {}) {
  const s = await H.newSession({ viewport: VIEW, fake: { pool, leaderboard: lb, summaryDays: days },
    storage: { ...H.signedInStorage('MinhAnh'), 'user-theme': theme },
    initScript: `Object.defineProperty(navigator,'language',{get:()=>'${lang}'});Object.defineProperty(navigator,'languages',{get:()=>['${lang}']});` });
  await s.goto('/');
  await s.page.evaluate((t) => localStorage.setItem('user-theme', t), theme);
  await s.reload();
  await H.sleep(2500);
  if (tab) {
    await s.page.evaluate((t) => { const b = [...document.querySelectorAll('nav[aria-label="Primary"] button')].find((x) => x.textContent.trim() === t); b?.click(); }, tab);
    await H.sleep(1500);
  }
  if (after) await after(s.page);
  await s.page.screenshot({ path: path.join(OUT, name) });
  console.log('saved', name, s.errors.slice(0, 2));
  await s.close();
}
await shot('01-learn-card.png', { theme: 'ocean' });
await shot('02-learn-card-vi.png', { theme: 'mint', lang: 'vi-VN' });
await shot('03-search.png', { theme: 'sakura', after: async (p) => {
  await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => /search/i.test(b.textContent || b.getAttribute('aria-label') || ''))?.click());
  await H.sleep(800);
  const inp = await p.$('input[type="search"], input[placeholder*="earch"], [role="dialog"] input');
  if (inp) { await inp.type('resilient', { delay: 30 }); await H.sleep(1500); }
} });
await shot('04-progress.png', { theme: 'ocean', tab: 'Progress' });
await shot('05-sets.png', { theme: 'ocean', tab: 'Sets' });
await shot('06-more-themes.png', { theme: 'cyber', tab: 'More' });
await H.teardown();
