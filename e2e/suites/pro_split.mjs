// Free / Pro split (build has VITE_ENABLE_PRO=true; the web build has no billing, so the sheet says "Pro is coming soon").
// Sessions here opt out of the harness's default Pro entitlement with { pro: false }.
import { test } from '../lib/framework.mjs';
import * as U from '../lib/ui.mjs';
import { sleep } from '../lib/harness.mjs';
const { ok, eq, waitText, click, body, boot, tab, importFile, setNames } = U;

const FREE = { pro: false };
const sheetText = (s) => s.page.evaluate(() => document.querySelector('[data-testid=pro-upgrade-sheet]')?.innerText || '');
const waitSheet = async (s, re) => {
  await s.page.waitForSelector('[data-testid=pro-upgrade-sheet]', { timeout: 8000 });
  await s.page.waitForFunction((src) => new RegExp(src).test(document.querySelector('[data-testid=pro-upgrade-sheet]')?.innerText || ''), { timeout: 8000 }, re.source);
};
const noBuy = (s) => s.page.evaluate(() => !document.querySelector('[data-testid=pro-buy]'));
const closeSheet = async (s) => { await s.page.keyboard.press('Escape'); await s.page.waitForFunction(() => !document.querySelector('[data-testid=pro-upgrade-sheet]'), { timeout: 5000 }); };
const theme = (s) => s.page.evaluate(() => ({ cls: [...document.body.classList].filter((c) => c.startsWith('theme-')).join(), dark: document.documentElement.classList.contains('dark'), ut: localStorage.getItem('user-theme') }));

test('PRO-01', 'Free: other themes are locked; tapping opens the sheet with "Pro is coming soon" (no billing on web) [FB-06]', async ({ session }) => {
  const s = await session({ ...FREE }); await boot(s);
  eq((await theme(s)).cls, 'theme-sloth');
  await tab(s, 'More');
  const st = await s.page.evaluate(() => [...document.querySelectorAll('[data-theme-option]')].map((b) => ({ n: b.dataset.themeOption, locked: b.dataset.locked, badge: !!b.querySelector('[aria-label="Pro feature"]'), h: b.getBoundingClientRect().height })));
  eq(st.map((x) => x.n), ['notes', 'sloth', 'blocks', 'pixel', 'riso']);
  for (const x of st) { eq(x.locked, x.n === 'sloth' ? 'false' : 'true', x.n); eq(x.badge, x.n !== 'sloth', x.n); ok(x.h >= 44, `tap target ${x.n} ${x.h}`); }
  await click(s, { label: 'Pixel Quest (Pro feature)' });
  await waitSheet(s, /Pro is coming soon/);
  ok(await noBuy(s), 'Buy button must not exist without billing');
  const t = await sheetText(s);
  ok(/No ads/.test(t) && /Import your own word sets/.test(t) && /Unlimited/.test(t) && /All 5 themes/.test(t) && /male voice/.test(t), 'benefits: ' + t);
  ok(/Restore purchases/.test(t) && /already bought Pro/.test(t), 'restore stays, with its help line [FB-58]');
  eq(await s.page.evaluate(() => document.querySelector('[data-feature=allThemes]').dataset.highlight), 'true');
  eq((await theme(s)).cls, 'theme-sloth', 'theme must not change');
  await sleep(800); await click(s, { text: 'Restore purchases' });
  await waitSheet(s, /not available|No previous purchase/i);
  await closeSheet(s);
});

test('PRO-02', 'Free with a stored non-sloth theme: moved to Cozy Sloth, dark kept, one-time toast [FB-06]', async ({ session }) => {
  const s = await session({ ...FREE, storage: { 'user-theme': 'riso', 'lv-dark': 'true' } }); await boot(s);
  await waitText(s, 'Your theme is now Cozy Sloth — other themes are part of Pro.');
  const r = await theme(s); eq(r.cls, 'theme-sloth'); eq(r.dark, true); eq(r.ut, 'sloth');
  await s.reload(); await sleep(1500);
  ok(!(await body(s)).includes('Your theme is now Cozy Sloth'), 'toast must be one-time');
  eq((await theme(s)).cls, 'theme-sloth');
});

test('PRO-03', 'Pro owner keeps a stored theme and sees "Pro unlocked ✓" in More [FB-06]', async ({ session }) => {
  const s = await session({ storage: { 'user-theme': 'riso' } }); await boot(s);
  eq((await theme(s)).cls, 'theme-riso');
  await tab(s, 'More');
  await waitText(s, 'Pro unlocked ✓');
  eq(await s.page.evaluate(() => document.querySelectorAll('[data-theme-option] [aria-label="Pro feature"]').length), 0);
});

test('PRO-04', 'Free: Quiz me works once per day, the second attempt opens the sheet [FB-06]', async ({ session }) => {
  const s = await session({ ...FREE }); await boot(s);
  await tab(s, 'Progress'); await waitText(s, 'Quiz me');
  await click(s, { text: 'Quiz me' }); await waitText(s, 'Question 1 of 5');
  await click(s, { text: 'Close' }); await sleep(300);
  await click(s, { text: 'Quiz me' });
  await waitSheet(s, /You've done today's free quiz\. Come back tomorrow or unlock unlimited quizzes with Pro\./);
  ok(!(await body(s)).includes('Question 1 of 5'), 'second quiz must not start');
  await closeSheet(s);
  // next local day: the stored date is yesterday, so a new quiz is allowed
  await s.page.evaluate(() => localStorage.setItem('lazyVoca.quiz.daily.v1', JSON.stringify({ date: '2000-01-01', count: 1 })));
  await click(s, { text: 'Quiz me' }); await waitText(s, 'Question 1 of 5');
});

test('PRO-05', 'Pro: Quiz me is unlimited [FB-06]', async ({ session }) => {
  const s = await session({}); await boot(s);
  await tab(s, 'Progress'); await waitText(s, 'Quiz me');
  for (let i = 0; i < 3; i++) { await click(s, { text: 'Quiz me' }); await waitText(s, 'Question 1 of 5'); await click(s, { text: 'Close' }); await sleep(300); }
  ok(!(await s.page.$('[data-testid=pro-upgrade-sheet]')), 'sheet must not open for Pro');
});

test('PRO-06', 'Free: import is locked (badge → sheet); sets imported earlier stay listed and usable [FB-06]', async ({ session }) => {
  // import while Pro, then lose Pro (refund) and reload
  const s = await session({}); await boot(s); await tab(s, 'Library'); await U.waitText(s, 'Create your own set');
  await importFile(s, 'vocab.csv'); await waitText(s, 'Imported 10 words into “vocab”.');
  await s.page.evaluate(() => localStorage.removeItem('lazyVoca.pro.v1'));
  await s.reload(); await sleep(1000); await tab(s, 'Library'); await waitText(s, 'Create your own set');
  eq(await setNames(s), ['Word Set: C1, C2', 'vocab']);
  const info = await s.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Choose file/.test(x.innerText)); return { locked: b.dataset.locked, badge: !!b.querySelector('[aria-label="Pro feature"]'), h: b.getBoundingClientRect().height }; });
  eq(info.locked, 'true'); ok(info.badge, 'badge'); ok(info.h >= 44, 'tap target');
  await click(s, { textHas: 'Choose file' });
  await waitSheet(s, /Import your own word sets/);
  eq(await s.page.evaluate(() => document.querySelector('[data-feature=importSets]').dataset.highlight), 'true');
  await closeSheet(s);
  // existing set: selectable, learnable, deletable
  await U.useOnly(s, 'vocab'); await tab(s, 'Learn');
  await s.page.waitForFunction(() => /^vocab\d+$/.test(document.querySelector('main h1')?.textContent || ''), { timeout: 8000 });
  await tab(s, 'Library');
  ok(await U.cardHas(s, 'vocab', 'Delete'), 'delete stays available');
});

test('PRO-07', 'Free: More shows the Pro card and its sheet opens without errors [FB-06]', async ({ session }) => {
  const s = await session({ ...FREE }); await boot(s); await tab(s, 'More');
  await click(s, { text: 'See Pro' });
  await waitSheet(s, /Pro is coming soon/);
  await closeSheet(s);
});
