import { test, skip } from '../lib/framework.mjs';
import * as U from '../lib/ui.mjs';
import { sleep } from '../lib/harness.mjs';
import fs from 'node:fs'; import path from 'node:path';
const { ok, eq, waitText, click, body, boot, tab, importFile, waitWord, ctl } = U;

const SHOTS = '/workspace/qa/e2e-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const THEMES = [['notes', 'Margin Notes'], ['sloth', 'Cozy Sloth'], ['blocks', 'Bold Blocks'], ['pixel', 'Pixel Quest'], ['riso', 'Riso Zine']];
const SHOT_VP = { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true };

// ---- in-page colour helpers (injected per call) ----
const PAGE_FNS = `
  window.__rgb = (css) => { const e = document.createElement('i'); e.style.color = css; document.body.appendChild(e); const c = getComputedStyle(e).color; e.remove(); const m = c.match(/[\\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m[3] === undefined ? 1 : m[3] }; };
  window.__lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  window.__cr = (a, b) => { const x = window.__lum(a), y = window.__lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  window.__over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  window.__bgOf = (el) => { const chain = []; let base = null; for (let e = el; e; e = e.parentElement) { const st = getComputedStyle(e); const bg = window.__rgb(st.backgroundColor); if (bg.a > 0) chain.push(bg); if (bg.a >= 1) break; const m = st.backgroundImage.includes('gradient') && st.backgroundImage.match(/rgba?\\([^)]+\\)/); if (m) { base = window.__rgb(m[0]); break; } } if (!base) base = { r: 255, g: 255, b: 255, a: 1 }; for (const c of chain.reverse()) base = window.__over(c, base); return base; };
`;
async function varContrast(s) {
  await s.page.evaluate(PAGE_FNS);
  return s.page.evaluate(() => {
    const v = (n) => window.__rgb(`var(${n})`);
    // Some pages paint the card on --lv-surface; resolve through a probe on body.
    const cs = getComputedStyle(document.body);
    const surf = window.__rgb(cs.getPropertyValue('--lv-surface') || cs.getPropertyValue('--lv-card-bg'));
    const bg = window.__rgb(cs.getPropertyValue('--lv-bg') || cs.getPropertyValue('--lv-body-bg'));
    const res = {};
    const probe = (name) => { const e = document.createElement('i'); e.style.color = `var(${name})`; document.body.appendChild(e); const c = window.__rgb(getComputedStyle(e).color); e.remove(); return c; };
    res['text/surface'] = window.__cr(probe('--lv-text-primary'), surf);
    res['text/bg'] = window.__cr(probe('--lv-text-primary'), bg);
    res['heading/surface'] = window.__cr(probe('--lv-heading'), surf);
    res['onAccent/accent'] = window.__cr(probe('--lv-button-primary-text'), probe('--lv-button-primary-bg'));
    res['meaning/surface'] = window.__cr(probe('--lv-meaning'), surf);
    res['vars'] = ['--lv-accent', '--lv-text-primary', '--lv-bg', '--lv-surface', '--lv-word-title'].map((n) => cs.getPropertyValue(n).trim());
    return res;
  });
}
/** Find visible text nodes whose colour is (nearly) invisible against its effective background. */
async function invisibleText(s) {
  await s.page.evaluate(PAGE_FNS);
  return s.page.evaluate(() => {
    const bad = [];
    const els = [...document.querySelectorAll('body *')].filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1));
    for (const e of els) {
      const r = e.getBoundingClientRect(); const st = getComputedStyle(e);
      if (r.width < 2 || r.height < 2 || st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) === 0) continue;
      if (e.closest('[aria-hidden=true]') || e.closest('.sr-only') || st.clip === 'rect(0px, 0px, 0px, 0px)') continue;
      if (st.backgroundImage !== 'none' && st.backgroundImage.includes('gradient')) continue;
      const fg = window.__rgb(st.color); const bgc = window.__bgOf(e); const eff = window.__over(fg, bgc);
      const ratio = window.__cr(eff, bgc);
      if (ratio < 2) bad.push(`${(e.textContent || '').trim().slice(0, 30)} (${ratio.toFixed(2)})`);
    }
    return bad.slice(0, 8);
  });
}
async function setTheme(s, name, label, dark) {
  await tab(s, 'More');
  await click(s, { label });
  const isDark = await s.page.evaluate(() => document.documentElement.classList.contains('dark'));
  if (isDark !== dark) await click(s, { labelRe: '^Switch to (dark|light) mode$' });
  await sleep(250);
}

THEMES.forEach(([name, label], i) => {
  [false, true].forEach((dark) => {
    const id = `THEME-${String(i * 2 + (dark ? 2 : 1)).padStart(2, '0')}`;
    test(id, `${label} · ${dark ? 'dark' : 'light'}: body class, vars, contrast, screenshots`, async ({ session }) => {
      const s = await session({ viewport: SHOT_VP }); await boot(s);
      await setTheme(s, name, label, dark);
      const st = await s.page.evaluate((label) => ({
        cls: [...document.body.classList], dark: document.documentElement.classList.contains('dark'),
        pressed: document.querySelector(`button[aria-label="${label}"]`).getAttribute('aria-pressed'),
        ut: localStorage.getItem('user-theme'), lvDark: localStorage.getItem('lv-dark'),
        toggle: [...document.querySelectorAll('button')].map((b) => b.getAttribute('aria-label')).find((l) => /^Switch to/.test(l || '')),
      }), label);
      ok(st.cls.includes('theme-' + name), 'body class ' + st.cls); eq(st.dark, dark); eq(st.pressed, 'true'); eq(st.ut, name);
      if (dark) { eq(st.lvDark, 'true'); eq(st.toggle, 'Switch to light mode'); } else eq(st.toggle, 'Switch to dark mode');
      const c = await varContrast(s);
      for (const k of ['text/surface', 'text/bg', 'heading/surface', 'onAccent/accent']) ok(c[k] >= 4.5, `${k} contrast ${c[k]?.toFixed?.(2)} (${name}${dark ? '-dark' : ''})`);
      ok(c.vars.every((x) => x), 'css vars defined ' + c.vars);
      global.__themeVars = global.__themeVars || {}; global.__themeVars[name + (dark ? '-dark' : '')] = c.vars.join('|');
      for (const t of ['Learn', 'Progress', 'Sets', 'More']) {
        await tab(s, t); await sleep(700);
        await s.page.screenshot({ path: path.join(SHOTS, `${name}-${dark ? 'dark' : 'light'}-${t.toLowerCase()}.png`) });
        const bad = await invisibleText(s); ok(bad.length === 0, `invisible text on ${t}: ${bad}`);
      }
    });
  });
});
test('THEME-VARS', 'Theme CSS variables differ between the 5 themes', async ({ session }) => {
  const seen = new Set();
  const s = await session({ viewport: SHOT_VP }); await boot(s);
  for (const [name, label] of THEMES) { await setTheme(s, name, label, false); await s.page.evaluate(PAGE_FNS); seen.add((await varContrast(s)).vars.join('|')); }
  eq(seen.size, 5, 'themes share identical variables');
});
skip('THEME-11', 'Unknown stored theme falls back to notes', 'covered by unit tests (tests/themes.test.tsx, tests/persistPlan.test.ts)');
test('THEME-14', 'New users get Cozy Sloth (light, Pro split on); legacy stored themes migrate to sloth, dark preference kept', async ({ session }) => {
  const s = await session({ viewport: SHOT_VP }); await boot(s);
  const st = await s.page.evaluate(() => ({ cls: [...document.body.classList].filter((c) => c.startsWith('theme-')), dark: document.documentElement.classList.contains('dark') }));
  eq(st.cls.join(), 'theme-sloth'); eq(st.dark, false);
  await tab(s, 'More'); eq(await s.page.evaluate(() => document.querySelectorAll('[data-theme-option]').length), 5);
  for (const legacy of ['mint', 'morning', 'ocean', 'sakura', 'cyber', 'bogus']) {
    const g = await session({ viewport: SHOT_VP, storage: { 'user-theme': legacy, 'lv-dark': 'true' } }); await boot(g);
    const r = await g.page.evaluate(() => ({ cls: [...document.body.classList].filter((c) => c.startsWith('theme-')), dark: document.documentElement.classList.contains('dark'), ut: localStorage.getItem('user-theme') }));
    eq(r.cls.join(), 'theme-sloth', legacy); eq(r.dark, true, legacy + ' dark kept'); eq(r.ut, 'sloth', legacy);
    await g.close();
  }
});
test('THEME-12', 'Overlays render readable in every theme (dark): dialogs, search, practice, AuthGate', async ({ session }) => {
  for (const [name] of THEMES) {
    const s = await session({ viewport: SHOT_VP, storage: { 'user-theme': name, 'lv-dark': 'true' } }); await boot(s);
    await s.page.evaluate(() => document.documentElement.classList.add('dark'));
    for (const [open, ready, close] of [
      [() => ctl(s, 'Mark as LEARNED'), 'Are you sure', () => click(s, { text: 'Cancel' })],
      [() => ctl(s, 'Quick Search'), 'Quick Search', () => click(s, { text: 'Close' })],
    ]) {
      await open(); await s.page.waitForFunction((t) => document.body.innerText.toLowerCase().includes(t.toLowerCase()), { timeout: 8000 }, ready); await sleep(300); // headings may be upper-cased by a theme
      const bad = await invisibleText(s); ok(bad.length === 0, `${name}: invisible text in ${ready}: ${bad}`);
      await close(); await sleep(250);
    }
    await s.close();
    const g = await session({ signedIn: false, viewport: SHOT_VP, storage: { 'user-theme': name, 'lv-dark': 'true' } });
    await g.goto('/'); await g.page.waitForFunction(() => document.body.innerText.toLowerCase().includes('access your vocabulary'), { timeout: 8000 }); await sleep(1200);
    const bad = await invisibleText(g); ok(bad.length === 0, `${name}: AuthGate invisible text: ${bad}`);
    await g.page.screenshot({ path: path.join(SHOTS, `${name}-dark-authgate.png`) });
    await g.close();
  }
});
test('THEME-13', 'Theme and dark mode persist after reload (Pixel Quest + dark)', async ({ session }) => {
  const s = await session({ viewport: SHOT_VP }); await boot(s); await setTheme(s, 'pixel', 'Pixel Quest', true);
  await s.reload();
  const st = await s.page.evaluate(() => ({ cls: [...document.body.classList], dark: document.documentElement.classList.contains('dark') }));
  ok(st.cls.includes('theme-pixel') && st.dark, JSON.stringify(st));
  await tab(s, 'More'); eq(await s.page.evaluate(() => document.querySelector('button[aria-label="Pixel Quest"]').getAttribute('aria-pressed')), 'true');
});

// ---------- MORE ----------
test('MORE-01', 'More panel content', async ({ session }) => {
  const s = await session({}); await boot(s); await tab(s, 'More');
  const t = await body(s);
  for (const x of ['More', 'Hello e2e', 'Sign out', 'How to do it?', 'Lazy Vocabulary v', '© 2025 Lazy Vocabulary']) ok(t.includes(x), 'missing ' + x);
  ok(!t.includes('Learning Word Set') && !t.includes('Audio settings stay'), 'removed active-set blurb should be absent');
  ok(!t.includes('Reset player'), 'Reset player should be absent');
  for (const [, label] of THEMES) ok(await s.page.$(`button[aria-label="${label}"]`), label);
  ok(await s.page.$('button[aria-label^="Switch to"]'), 'dark toggle');
  const a = await s.page.evaluate(() => { const l = [...document.querySelectorAll('a')].find((x) => x.textContent.trim() === 'How to do it?'); return { href: l.href, target: l.target, rel: l.rel }; });
  ok(/youtube\.com|youtu\.be/.test(a.href) && a.target === '_blank' && /noopener/.test(a.rel), JSON.stringify(a));
});
for (const [perm, expect] of [['default', 'false'], ['granted', 'true'], ['denied', 'false'], [null, null]]) {
  test(`MORE-02-${perm}`, `Notification permission ${perm}: toggle ${perm ? 'aria-pressed=' + expect : 'hidden'}`, async ({ session }) => {
    const init = perm ? `window.Notification = function(){}; window.Notification.permission='${perm}'; window.Notification.requestPermission = async () => '${perm}';` : 'delete window.Notification;';
    const s = await session({ initScript: init }); await boot(s); await tab(s, 'More');
    const b = await s.page.evaluate(() => { const e = [...document.querySelectorAll('button')].find((x) => /reminder|notification/i.test(x.getAttribute('aria-label') || '')); return e ? e.getAttribute('aria-pressed') : undefined; });
    if (perm) eq(b, expect, 'aria-pressed'); else eq(b, undefined, 'toggle should be hidden');
  });
}
skip('MORE-04', 'Delete account absent', 'product gap');

// ---------- ACCT ----------
const signOut = async (s) => { await tab(s, 'More'); await click(s, { text: 'Sign out' }); };
test('ACCT-01', 'Sign out: toast, gate, keys removed', async ({ session }) => {
  const s = await session({}); await boot(s); await signOut(s);
  await waitText(s, 'Access your vocabulary');
  for (const k of ['lazyVoca.nickname', 'lazyVoca.passcode', 'lazyVoca.userKey', 'lazyVoca.auth', 'lazyVoca.authState']) eq(await s.ls(k), null, k + ' should be removed');
  ok(!(await body(s)).includes('Hello e2e'), 'greeting remains');
});
test('ACCT-02', 'Sign out keeps sets, theme and preferences; sign-in again restores them', async ({ session }) => {
  const s = await session({ viewport: SHOT_VP }); await boot(s); await importFile(s, 'setA.csv'); await waitText(s, 'was added to your selection'); await U.builtinOff(s);
  await setTheme(s, 'pixel', 'Pixel Quest', false); await signOut(s); await waitText(s, 'Access your vocabulary');
  ok(await s.ls('lv.vocabularySets.v1'), 'sets kept'); eq(await s.ls('user-theme'), 'pixel'); ok(await s.ls('lv_preferences'), 'prefs kept');
  await s.page.type('input[placeholder="e.g., Mi mi U"]', 'e2e'); await s.page.type('input[type=password]', '1234'); await click(s, { text: 'Sign in' });
  await s.page.waitForFunction(() => localStorage.getItem('lazyVoca.nickname') === 'e2e', { timeout: 8000 }); await sleep(1800);
  await tab(s, 'Sets'); await waitText(s, 'setA');
});
test('ACCT-03', 'After sign-out + reload the gate shows and no stale session remains', async ({ session }) => {
  const s = await session({}); await boot(s); await signOut(s); await waitText(s, 'Access your vocabulary');
  await s.reload(); await waitText(s, 'Access your vocabulary'); eq(await s.ls('lazyVoca.auth'), null);
});
skip('ACCT-06', 'Delete account fails gracefully', 'product gap: no delete-account feature on this branch (ACCT-DEL-* belong to feat/play-store-ads-release)');

// ---------- PERSIST ----------
test('PERSIST-01', 'Theme persists (Pixel Quest + dark)', async ({ session }) => {
  const s = await session({ viewport: SHOT_VP }); await boot(s); await setTheme(s, 'pixel', 'Pixel Quest', true); await s.reload();
  ok(await s.page.evaluate(() => document.body.classList.contains('theme-pixel') && document.documentElement.classList.contains('dark')));
});
test('PERSIST-02', 'Active set persists; a set removed from storage falls back to built-in', async ({ session }) => {
  const s = await session({}); await boot(s); await importFile(s, 'setA.csv'); await waitText(s, 'was added to your selection'); await U.builtinOff(s);
  await s.reload(); await tab(s, 'Learn'); await s.page.waitForFunction(() => /^aaa/.test(document.querySelector('main h1')?.textContent || ''), { timeout: 10000 });
  ok((await s.page.evaluate(() => document.querySelector('header').innerText)).includes('setA'), 'header');
  const id = (await U.metaSets(s))[0].id;
  await s.page.evaluate((id) => localStorage.removeItem('lv.vocabularySets.data.' + id), id); await s.reload();
  await waitWord(s, U.POOL_ORDER[0], 12000);
});
test('PERSIST-03', 'Imported-set progress persists', async ({ session }) => {
  const s = await session({}); await boot(s); await importFile(s, 'setA.csv'); await waitText(s, 'was added to your selection'); await U.builtinOff(s);
  for (let i = 0; i < 2; i++) { await tab(s, 'Learn'); await s.page.waitForFunction(() => /^aaa/.test(document.querySelector('main h1')?.textContent || ''), { timeout: 8000 }); await sleep(500);
    await ctl(s, 'Mark as LEARNED'); await click(s, { text: 'Mark as Learned', inDialog: true }); await waitText(s, 'Word marked as learned.'); await U.waitGone(s, 'Are you sure'); await sleep(800); }
  await s.reload(); await tab(s, 'Sets'); await waitText(s, '2 learned on this device');
});
test('PERSIST-04', 'Built-in progress after reload comes back from the server + cache', async ({ session }) => {
  const s = await session({}); await boot(s);
  await ctl(s, 'Mark as LEARNED'); await click(s, { text: 'Mark as Learned', inDialog: true }); await waitText(s, 'Word marked as learned.'); await sleep(800);
  await s.reload(); await sleep(2000); await tab(s, 'Progress'); await waitText(s, 'Quiz me');
  await click(s, { textHas: 'Word Summary' }); await sleep(400);
  ok(/LEARNED\s*\(1\)/i.test((await body(s)).replace(/\n/g, ' ')), 'LEARNED (1) lost after reload');
});
test('PERSIST-05', 'Muted, paused, 1.5x and GB voice persist', async ({ session }) => {
  const s = await session({}); await boot(s);
  await ctl(s, 'Change Voice'); await sleep(400); await ctl(s, 'Mute'); await ctl(s, 'Pause'); await sleep(300);
  await ctl(s, 'Speech Rate'); await sleep(300); await s.page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^1\.5\s*[×x]$/.test(b.textContent.trim())).click()); await sleep(500);
  const before = await U.prefs(s);
  await s.reload(); await waitWord(s, U.POOL_ORDER[0], 12000); await sleep(1500);
  const p = await U.prefs(s); eq([p.is_muted, p.is_playing, p.speech_rate, p.favorite_voice], [true, false, 1.5, 'Stub GB'], JSON.stringify(before));
  ok(await U.label(s, 'Unmute') && await U.label(s, 'Play'), 'buttons');
});
test('PERSIST-06', 'Last word restored same day; new day starts at list start', async ({ session }) => {
  const s = await session({}); await boot(s);
  for (let i = 1; i <= 3; i++) { await ctl(s, 'Next Word'); await waitWord(s, U.POOL_ORDER[i]); await sleep(450); }
  await s.reload(); await waitWord(s, U.POOL_ORDER[3], 12000);
  const lw = JSON.parse(await s.ls('lazyVoca.todayLastWord')); lw.date = '2000-01-01';
  await s.setLs('lazyVoca.todayLastWord', JSON.stringify(lw)); await s.reload(); await waitWord(s, U.POOL_ORDER[0], 12000);
});
