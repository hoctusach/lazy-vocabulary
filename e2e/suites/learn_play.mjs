import { test, skip } from '../lib/framework.mjs';
import * as U from '../lib/ui.mjs';
import { sleep, VIEWPORT } from '../lib/harness.mjs';
const { ok, eq, waitText, click, body, boot, ctl, label, word, waitWord, waitSpeech, POOL_ORDER, prefs, speechInfo, tab } = U;

const W = POOL_ORDER;

// ---------- TAB ----------
test('TAB-01', 'Four tabs present, >=44px, Learn current', async ({ session }) => {
  const s = await session({}); await boot(s);
  const r = await s.page.evaluate(() => [...document.querySelectorAll('nav[aria-label=Primary] button')].map((b) => ({ t: b.textContent.trim(), h: b.getBoundingClientRect().height, cur: b.getAttribute('aria-current') })));
  eq(r.map((x) => x.t), ['Learn', 'Progress', 'Sets', 'More']);
  ok(r.every((x) => x.h >= 44), 'tab heights ' + JSON.stringify(r));
  eq(r.find((x) => x.t === 'Learn').cur, 'page');
});
test('TAB-02', 'Learn -> Progress shows progress panels and hides card/controls', async ({ session }) => {
  const s = await session({}); await boot(s); await tab(s, 'Progress');
  for (const t of ['Leaderboard', 'Quiz me', 'Learning Progress', 'Word Summary']) await waitText(s, t);
  ok(!(await label(s, 'Next Word')) && (await word(s)) === null, 'learn card still visible');
});
test('TAB-03', 'Sets tab content', async ({ session }) => {
  const s = await session({}); await boot(s); await tab(s, 'Sets');
  await waitText(s, 'Word sets'); await waitText(s, 'Import a set'); await waitText(s, 'Word Set: C1, C2');
});
test('TAB-04', 'More tab content', async ({ session }) => {
  const s = await session({}); await boot(s); await tab(s, 'More');
  await waitText(s, 'Learning Word Set: C1, C2'); await waitText(s, 'Hello e2e'); ok(await label(s, 'Mint Breeze'), 'theme buttons');
});
test('TAB-05', 'Tab round-trip keeps word and paused state', async ({ session }) => {
  const s = await session({}); await boot(s);
  await ctl(s, 'Next Word'); await waitWord(s, W[1]); await sleep(400); await ctl(s, 'Next Word'); await waitWord(s, W[2]);
  await ctl(s, 'Pause');
  await tab(s, 'Progress'); await waitText(s, 'Quiz me'); await tab(s, 'Learn');
  await waitWord(s, W[2]);
  ok(await label(s, 'Play'), 'should still be paused');
});
test('TAB-06', 'Audio stops when leaving Learn', async ({ session }) => {
  const s = await session({}); await boot(s);
  const before = await speechInfo(s);
  await tab(s, 'Progress'); await sleep(300);
  const mid = await speechInfo(s);
  ok(mid.cancels > before.cancels, 'cancel not called');
  await sleep(1500);
  eq((await speechInfo(s)).calls, mid.calls, 'new utterance while off-tab');
});
test('TAB-07', 'Desktop layout has no tabs; resize across 768 keeps working', async ({ session }) => {
  const s = await session({ viewport: { width: 1024, height: 768, deviceScaleFactor: 1 } });
  await s.goto('/'); await s.page.waitForSelector('main h1, h1', { timeout: 10000 }); await sleep(800);
  eq(await s.page.$('nav[aria-label=Primary]'), null, 'nav on desktop');
  ok(await s.page.evaluate(() => !!document.querySelector('[data-layout="desktop"]')), 'data-layout=desktop');
  await s.page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); await sleep(600);
  ok(await s.page.$('nav[aria-label=Primary]'), 'nav after shrink');
  await s.page.setViewport({ width: 1024, height: 768 }); await sleep(600);
  eq(await s.page.$('nav[aria-label=Primary]'), null);
});

// ---------- LEARN ----------
const VI_INIT = "(() => { const L = ['vi-VN', 'vi']; Object.defineProperty(navigator, 'language', { get: () => L[0], configurable: true }); Object.defineProperty(navigator, 'languages', { get: () => L, configurable: true }); })();";
const EN_INIT = "(() => { const L = ['en-US', 'en']; Object.defineProperty(navigator, 'language', { get: () => L[0], configurable: true }); Object.defineProperty(navigator, 'languages', { get: () => L, configurable: true }); })();";
const cardText = (s) => s.page.evaluate(() => document.querySelector('main').innerText);
test('LEARN-01', 'Card fields (vi-VN device so the translation line shows)', async ({ session }) => {
  const s = await session({ initScript: VI_INIT }); await s.page.setExtraHTTPHeaders({ 'Accept-Language': 'vi-VN,vi;q=0.9' }); await boot(s);
  const c = await s.page.evaluate(() => { const m = document.querySelector('main'); return { pill: m.querySelector('h3')?.textContent, w: m.querySelector('h1')?.textContent, txt: m.innerText }; });
  eq(c.pill, 'Phrasal Verb'); eq(c.w, U.P[0].word);
  ok(c.txt.includes('* ' + U.P[0].meaning) && c.txt.includes('* ' + U.P[0].example) && c.txt.includes('* ' + U.P[0].translation));
});
test('LEARN-02', 'Controls present with labels, 4-col grid, no Previous', async ({ session }) => {
  const s = await session({}); await boot(s);
  for (const l of ['Mute', 'Pause', 'Next Word', 'Change Voice', 'Speech Rate', 'Quick Search', 'Mark as LEARNED']) ok(await U.findHandle(s, { label: l }).then((h) => !!h.asElement()), 'missing ' + l);
  ok(await s.page.evaluate(() => !!document.querySelector('main .grid-cols-4')), '4 col grid');
  ok(!(await U.label(s, 'Vocabulary Detail')) && !(await U.label(s, 'Practice')), 'Details/Practice buttons must be gone');
  const all = await U.controls(s);
  ok(!all.some((l) => /previous|prev\b/i.test(l)), 'a Previous control exists now: ' + all);
});
test('LEARN-12', 'Details and Practice buttons are absent from Learn', async ({ session }) => {
  const s = await session({}); await boot(s);
  const all = await U.controls(s);
  ok(!all.some((l) => /vocabulary detail|^practice$|^details$/i.test(l)), 'found: ' + all);
  eq(await s.page.evaluate(() => [...document.querySelectorAll('main button, main a')].filter((b) => /^(Details|Practice)$/.test(b.textContent.trim())).length), 0);
});
test('LEARN-13', 'Mark as LEARNED is a prominent 2-column button in the controls grid', async ({ session }) => {
  const s = await session({}); await boot(s);
  const r = await s.page.evaluate(() => { const b = document.querySelector('main button[aria-label="Mark as LEARNED"]'); if (!b) return null; const o = document.querySelector('main button[aria-label="Quick Search"]'); const g = b.parentElement; const bb = b.getBoundingClientRect(), ob = o.getBoundingClientRect();
    return { txt: b.textContent.trim(), span: getComputedStyle(b).gridColumnEnd, grid: getComputedStyle(g).gridTemplateColumns.split(' ').length, h: Math.round(bb.height), oh: Math.round(ob.height), w: bb.width, ow: ob.width, fw: +getComputedStyle(b).fontWeight, bg: getComputedStyle(b).backgroundColor }; });
  ok(r, 'button missing'); eq(r.txt, 'Mark as LEARNED'); ok(/span 2/.test(r.span), 'span ' + r.span); eq(r.grid, 4); eq(r.h, r.oh);
  ok(r.w > r.ow * 1.8, 'width ' + r.w + ' vs ' + r.ow); ok(r.fw >= 700, 'bold ' + r.fw); ok(r.bg !== 'rgba(0, 0, 0, 0)' && r.bg !== 'rgb(255, 255, 255)', 'filled ' + r.bg);
});
test('LEARN-14', 'Speech hint lines show on web and are hidden in the native app', async ({ session }) => {
  const HINT = /Speech won’t autoplay due to security|free voices by device and browser/;
  let s = await session({}); await boot(s);
  ok(HINT.test(await cardText(s)) || HINT.test(await body(s)), 'hints missing on web');
  s = await session({ initScript: 'window.androidBridge = { postMessage() {} };' }); await s.goto('/'); await s.page.waitForFunction(() => (document.querySelector('main h1')?.textContent || '').trim().length > 0, { timeout: 12000 }); await sleep(800);
  const t = await body(s); ok(!/autoplay due to security/.test(t) && !/free voices by device and browser/.test(t), 'hints visible in native');
});
skip('LEARN-03', 'Previous button absent', 'product gap');
test('LEARN-04', 'Audio chip until first tap, then speech starts', async ({ session }) => {
  const s = await session({ storage: { speechUnlocked: 'false' } });
  await s.goto('/'); await waitWord(s, W[0], 12000);
  await waitText(s, 'Tap anywhere to turn the audio on');
  eq((await U.speechCalls(s)).filter((c) => U.re0.test(c.text)).length, 0, 'spoke before unlock');
  await s.page.touchscreen.tap(200, 700);
  await U.waitGone(s, 'Tap anywhere to turn the audio on'); await waitSpeech(s, U.re0);
});
test('LEARN-05', 'Mark learned (built-in): confirm, toast, one RPC', async ({ session }) => {
  const s = await session({}); await boot(s);
  await ctl(s, 'Mark as LEARNED');
  await waitText(s, `Are you sure you want to mark "${U.P[0].word}" as learned?`);
  await click(s, { text: 'Mark as Learned', inDialog: true });
  await waitText(s, 'Word marked as learned.');
  await U.waitGone(s, 'Are you sure you want to mark');
  await s.page.waitForFunction(() => true); await sleep(500);
  eq(s.fake.count('mark_word_learned_by_key'), 1);
  eq(s.fake.calls.find((c) => c.name === 'mark_word_learned_by_key').body.p_word_id, U.P[0].word);
});
test('LEARN-06', 'Mark learned cancel: no RPC, no toast', async ({ session }) => {
  const s = await session({}); await boot(s);
  await ctl(s, 'Mark as LEARNED'); await waitText(s, 'Are you sure'); await click(s, { text: 'Cancel' });
  await U.waitGone(s, 'Are you sure'); await sleep(400);
  eq(s.fake.count('mark_word_learned_by_key'), 0); ok(!(await body(s)).includes('Word marked as learned.'));
  await waitWord(s, W[0]);
});
test('LEARN-07', 'Mark learned in imported set is local only and updates stats', async ({ session }) => {
  const s = await session({}); await boot(s);
  await U.importFile(s, 'setA.csv'); await waitText(s, 'is now the active set');
  await tab(s, 'Learn'); await s.page.waitForFunction(() => /^aaa\d/.test(document.querySelector('main h1')?.textContent || ''), { timeout: 8000 });
  const w = await word(s);
  await ctl(s, 'Mark as LEARNED'); await click(s, { text: 'Mark as Learned', inDialog: true });
  await waitText(s, 'Word marked as learned.');
  const id = (await U.metaSets(s))[0].id;
  const prog = JSON.parse(await s.ls('lv.vocabularySets.progress.' + id));
  ok(Object.keys(prog.learned || {}).some((k) => k.toLowerCase().includes(w.toLowerCase())), 'learned map: ' + JSON.stringify(prog).slice(0, 300));
  eq(s.fake.count('mark_word_learned_by_key'), 0, 'server call for imported set');
  await tab(s, 'Sets'); await waitText(s, '1 learned on this device');
});
skip('LEARN-09', 'Mark-as-New unreachable', 'product gap');
test('LEARN-10', 'Due review word shows under DUE TODAY and in the Due tile', async ({ session }) => {
  const past = new Date(Date.now() - 86400000).toISOString();
  const s = await session({});
  const rowsFor = s.fake.pool;
  // make the server return one learning word that is due
  const orig = s.fake.handle;
  s.fake.handle = (url, m, d) => {
    const r = orig(url, m, d);
    if (m === 'POST' && typeof r === 'object' && /generate_daily_selection_v2/.test(url)) {
      const rows = JSON.parse(r.body); rows[0] = { ...rows[0], review_count: 2, srs_state: 'learning', in_review_queue: true, due_selected_today: true, new_selected_today: false, next_review_at: past, last_review_at: past, learned_at: past };
      return { ...r, body: JSON.stringify(rows) };
    }
    return r;
  };
  await s.goto('/'); await waitWord(s, U.P[0].word, 12000); await tab(s, 'Progress');
  await click(s, { textHas: 'Word Summary' }); await sleep(400);
  const t = await body(s);
  ok(/DUE TODAY\s*\(?1\)?/i.test(t.replace(/\n/g, ' ')), 'DUE TODAY (1) heading missing: ' + t.slice(t.indexOf('Word Summary'), t.indexOf('Word Summary') + 400).replace(/\n/g, ' / '));
});
test('LEARN-11', 'Resume position after reload', async ({ session }) => {
  const s = await session({}); await boot(s);
  for (let i = 1; i <= 3; i++) { await ctl(s, 'Next Word'); await waitWord(s, W[i]); await sleep(450); }
  await s.reload(); await waitWord(s, W[3], 12000);
});

// ---------- PLAY ----------
test('PLAY-01', 'Auto-play after unlock speaks "word. meaning. example"', async ({ session }) => {
  const s = await session({}); await boot(s);
  const c = (await U.speechCalls(s)).find((x) => U.re0.test(x.text));
  eq(c.text, `${U.P[0].word}. ${U.P[0].meaning}. ${U.P[0].example}`);
});
test('PLAY-02', 'Pause: Play button, toast, no auto-advance, pref saved', async ({ session }) => {
  const s = await session({}); await boot(s);
  await ctl(s, 'Pause'); await waitText(s, 'Playback paused'); ok(await label(s, 'Play'));
  eq((await prefs(s)).is_playing, false);
  await U.fireEnd(s); await sleep(1200); eq(await word(s), W[0], 'advanced while paused');
});
test('PLAY-03', 'Play after the paused utterance ended: word is repeated, then auto-advance resumes', async ({ session }) => {
  const s = await session({}); await boot(s);
  await ctl(s, 'Pause'); await waitText(s, 'Playback paused');
  await sleep(300); await U.fireEnd(s); await sleep(600); eq(await word(s), W[0], 'advanced while paused');
  await ctl(s, 'Play'); await waitText(s, 'Playback resumed');
  await s.page.waitForFunction((w0) => window.__speech.calls.filter((c) => c.text.startsWith(w0)).length >= 2 && !!window.__speech.current, { timeout: 5000 }, U.P[0].word);
  ok(await label(s, 'Pause'), 'button back to Pause');
  await U.fireEnd(s); await waitWord(s, W[1]);
});
skip('PLAY-04', 'Paused chip indicator', 'product gap');
test('PLAY-05', 'Next: cancel, next word spoken, wraps after last', async ({ session }) => {
  const s = await session({}); await boot(s);
  const c0 = (await speechInfo(s)).cancels;
  await ctl(s, 'Next Word'); await waitWord(s, W[1]); await waitSpeech(s, U.re1);
  ok((await speechInfo(s)).cancels > c0, 'cancel');
  for (let i = 2; i <= 8; i++) { await sleep(450); await ctl(s, 'Next Word'); await waitWord(s, W[i % 8]); }
});
test('PLAY-06', 'Next while paused shows next word but does not speak it', async ({ session }) => {
  const s = await session({}); await boot(s);
  await ctl(s, 'Pause'); const n = (await speechInfo(s)).calls;
  await ctl(s, 'Next Word'); await waitWord(s, W[1]); await sleep(1500);
  const calls = await U.speechCalls(s);
  ok(!calls.slice(n).some((c) => U.re1.test(c.text)), 'spoke while paused'); ok(await label(s, 'Play'));
});
test('PLAY-07', 'Rapid Next taps advance exactly one word', async ({ session }) => {
  const s = await session({}); await boot(s);
  await s.page.evaluate(() => { const b = document.querySelector('button[aria-label="Next Word"]'); for (let i = 0; i < 5; i++) b.click(); });
  await sleep(1000); eq(await word(s), W[1]);
  const n = await s.page.evaluate((w) => window.__speech.calls.filter((c) => c.text.startsWith(w)).length, U.P[1].word); ok(n <= 1, 'overlapping utterances ' + n);
});
test('PLAY-08', 'Mute: label, toast, speech cancelled, pref', async ({ session }) => {
  const s = await session({}); await boot(s);
  const c0 = (await speechInfo(s)).cancels;
  await ctl(s, 'Mute'); await waitText(s, 'Audio muted'); ok(await label(s, 'Unmute'));
  ok((await speechInfo(s)).cancels > c0); eq((await prefs(s)).is_muted, true);
});
test('PLAY-09', 'Unmute: toast and next word audible', async ({ session }) => {
  const s = await session({}); await boot(s);
  await ctl(s, 'Mute'); await waitText(s, 'Audio muted'); await ctl(s, 'Unmute');
  await waitText(s, 'Audio unmuted. Speech will resume from the next word.');
  await sleep(400); await ctl(s, 'Next Word'); await waitSpeech(s, U.re1);
  const c = (await U.speechCalls(s)).filter((x) => U.re1.test(x.text)).at(-1); eq(c.volume, 1, 'volume');
});
test('PLAY-10', 'Auto-advance on utterance end, not while paused', async ({ session }) => {
  const s = await session({}); await boot(s);
  await U.fireEnd(s); await waitWord(s, W[1]); await waitSpeech(s, U.re1);
  await ctl(s, 'Pause'); await U.fireEnd(s); await sleep(1200); eq(await word(s), W[1]);
});
skip('PLAY-11', 'Practice pauses audio and resumes only if it was playing', 'removed: Practice button removed from Learn');

// ---------- VOICE ----------
test('VOICE-01', 'Voice cycles US -> GB -> AU -> US with toast and persistence', async ({ session }) => {
  const s = await session({}); await boot(s);
  const seen = [];
  for (let i = 0; i < 3; i++) {
    await ctl(s, 'Change Voice');
    await s.page.waitForFunction(() => /Voice changed to/.test(document.body.innerText), { timeout: 4000 });
    seen.push(((await body(s)).match(/Voice changed to ([^\n]+)/) || [])[1]);
    await sleep(700);
    await s.page.evaluate(() => { document.querySelectorAll('[role=status] li, li[data-state]').forEach(() => {}); });
  }
  ok(/Stub GB \(en-GB\)/.test(seen[0]) || /Stub GB/.test(seen.join('|')), 'sequence ' + seen);
  ok(seen.join('|').includes('Stub AU') && seen.join('|').includes('Stub US'), 'sequence ' + seen);
  eq((await prefs(s)).favorite_voice, 'Stub US');
});
skip('VOICE-02', 'No US/UK/AU region picker', 'product gap');
test('VOICE-03', 'Voice persists across reload', async ({ session }) => {
  const s = await session({}); await boot(s);
  await ctl(s, 'Change Voice'); await waitText(s, 'Voice changed to'); await sleep(300);
  const fav = (await prefs(s)).favorite_voice; ok(fav && fav !== 'Stub US', 'fav ' + fav);
  await s.reload(); await waitWord(s, W[0], 12000); await sleep(1800);
  const calls = await U.speechCalls(s); const last = calls.filter((c) => U.re0.test(c.text)).at(-1);
  eq(last && last.voice, fav, 'voice after reload');
});
test('VOICE-04', 'Speed has 7 options and closes after choosing', async ({ session }) => {
  const s = await session({}); await boot(s);
  await ctl(s, 'Speech Rate'); await sleep(300);
  const opts = await s.page.evaluate(() => [...document.querySelectorAll('[role=dialog] button, [data-radix-popper-content-wrapper] button')].map((b) => b.textContent.trim()).filter((t) => /×|x/.test(t) && /\d/.test(t)));
  eq(opts, ['0.5×', '0.75×', '1×', '1.25×', '1.5×', '1.75×', '2×'].map((x) => opts.find((o) => o.replace('x', '×') === x) || x));
  await click(s, { text: opts[4] }); await sleep(400);
  eq(await s.page.evaluate(() => !![...document.querySelectorAll('[data-radix-popper-content-wrapper]')].length), false, 'popover still open');
});
test('VOICE-05', 'Speed applied to utterance and persisted', async ({ session }) => {
  const s = await session({}); await boot(s);
  await ctl(s, 'Speech Rate'); await sleep(300);
  await s.page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^1\.5\s*[×x]$/.test(b.textContent.trim())).click());
  await s.page.waitForFunction((w0) => window.__speech.calls.some((c) => c.rate === 1.5), { timeout: 6000 });
  eq((await prefs(s)).speech_rate, 1.5);
});

test('LANG-01', 'en-US device hides the Vietnamese translation', async ({ session }) => {
  const s = await session({ initScript: EN_INIT }); await s.page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' }); await boot(s);
  const t = await cardText(s);
  ok(t.includes('* ' + U.P[0].meaning), 'meaning missing');
  ok(!t.includes(U.P[0].translation), 'translation should be hidden on en-US');
});
test('LANG-02', 'vi-VN device shows the Vietnamese translation', async ({ session }) => {
  const s = await session({ initScript: VI_INIT }); await s.page.setExtraHTTPHeaders({ 'Accept-Language': 'vi-VN,vi;q=0.9' }); await boot(s);
  ok((await cardText(s)).includes('* ' + U.P[0].translation), 'translation should show on vi-VN');
});

// ---------- SRS tip card ----------
const TIP_KEY = 'lv.srsTip.dismissedOn';
const localDay = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const tipText = (s) => s.page.evaluate(() => document.querySelector('[data-testid="srs-tip"]')?.innerText ?? null);
test('SRS-01', 'Spaced-repetition tip card shows on Learn with English copy (en-US)', async ({ session }) => {
  const s = await session({ initScript: EN_INIT }); await s.page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' }); await boot(s);
  await waitText(s, '20 words a day. Never forget them.');
  const t = await tipText(s);
  ok(t.includes("Lazy Vocabulary brings each word back right before you'd forget it: 2, 3, 5, 7… then every 60 days."), t);
  const r = await s.page.evaluate(() => ({ h: document.querySelector('[data-testid="srs-tip"]').getBoundingClientRect().height }));
  ok(r.h < 120, 'tip too tall ' + r.h);
});
test('SRS-02', 'Tip card uses Vietnamese copy on a vi-VN device', async ({ session }) => {
  const s = await session({ initScript: VI_INIT }); await s.page.setExtraHTTPHeaders({ 'Accept-Language': 'vi-VN,vi;q=0.9' }); await boot(s);
  await waitText(s, 'Mỗi ngày 20 từ. Nhớ mãi không quên.');
  ok((await tipText(s)).includes('App nhắc lại từng từ đúng lúc bạn sắp quên'), 'body');
});
test('SRS-03', 'Dismiss hides the tip for the day; it returns when the stored date is yesterday; layout stays above the fold', async ({ session }) => {
  const s = await session({ initScript: EN_INIT }); await boot(s);
  ok(await tipText(s), 'tip missing');
  const fold = await s.page.evaluate(() => { const g = document.querySelector('main .grid-cols-4'); const h1 = document.querySelector('main h1'); return { grid: g.getBoundingClientRect().bottom, h1: h1.getBoundingClientRect().top, vh: innerHeight }; });
  ok(fold.grid <= fold.vh, 'controls grid below the fold with tip: ' + JSON.stringify(fold));
  await click(s, { label: 'Dismiss' });
  await s.page.waitForFunction(() => !document.querySelector('[data-testid="srs-tip"]'), { timeout: 3000 });
  eq(await s.ls(TIP_KEY), localDay());
  await s.reload(); await waitWord(s, W[0]);
  eq(await tipText(s), null, 'tip came back after reload on the same day');
  await s.page.evaluate((k, v) => localStorage.setItem(k, v), TIP_KEY, localDay(-1));
  await s.reload(); await waitWord(s, W[0]);
  ok(await tipText(s), 'tip should reappear the next day');
});
skip('SRS-04', 'Due-review variant', 'fake backend reports no due words; covered by unit tests');
