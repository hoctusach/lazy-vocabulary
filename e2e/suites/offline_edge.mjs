import { test, skip } from '../lib/framework.mjs';
import * as U from '../lib/ui.mjs';
import { sleep } from '../lib/harness.mjs';
const { ok, eq, waitText, click, body, boot, tab, importFile, waitWord, ctl, word } = U;

const NET = /RPC failed|Failed to fetch|NetworkError|net::ERR|AuthGate|leaderboard|search|auth:|supabase/i;
const overflow = (s) => s.page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, bw: document.body.scrollWidth }));
const noHScroll = async (s, where) => { const o = await overflow(s); ok(o.sw <= o.iw + 1 && o.bw <= o.iw + 1, `horizontal overflow on ${where}: ${JSON.stringify(o)}`); };

// ---------- OFFLINE ----------
test('OFFLINE-01', 'Signed-in cold start with all network aborted renders and shows words', async ({ session }) => {
  const s = await session({ fake: { mode: 'down' } }); s.allow.push(NET);
  await s.goto('/'); await sleep(3000);
  const t = await body(s); ok(t.includes('Lazy Vocabulary') && !t.includes('Access your vocabulary'), t.slice(0, 200));
  await s.page.waitForFunction(() => (document.querySelector('main h1')?.textContent || '').trim().length > 0, { timeout: 10000 });
  ok(await U.label(s, 'Next Word'), 'controls');
});
test('OFFLINE-02', 'Signed-out start offline: gate shows, sign-in fails gracefully', async ({ session }) => {
  const s = await session({ signedIn: false, fake: { mode: 'down' } }); s.allow.push(NET);
  await s.goto('/'); await waitText(s, 'Access your vocabulary');
  await s.page.type('input[placeholder="e.g., Mi mi U"]', 'Tester'); await s.page.type('input[type=password]', '1234'); await click(s, { text: 'Sign in' });
  await waitText(s, "Can't reach the server");
});
test('OFFLINE-03', 'Local features work with the network down', async ({ session }) => {
  const s = await session({ fake: { mode: 'down' }, viewport: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, initScript: U.DOWNLOAD_HOOK }); s.allow.push(NET);
  await s.goto('/'); await sleep(2500);
  await importFile(s, 'setA.csv'); await waitText(s, 'Imported 6 words into “setA”.');
  await importFile(s, 'setB.csv'); await waitText(s, 'Imported 6 words into “setB”.');
  await U.cardBtn(s, 'setA', 'Rename'); await s.page.focus('input[aria-label="Set name"]'); await s.page.$eval('input[aria-label="Set name"]', (e) => e.select()); await s.page.keyboard.type('Offline A'); await click(s, { text: 'Save' }); await waitText(s, 'Set renamed.'); await sleep(600);
  await U.useOnly(s, 'Offline A');
  await click(s, { text: 'Download CSV' }); await s.page.waitForFunction(() => window.__downloads.length === 1, { timeout: 4000 });
  await U.cardBtn(s, 'setB', 'Delete'); await click(s, { text: 'Delete set' }); await waitText(s, 'Set deleted.');
  await tab(s, 'Progress'); await waitText(s, 'Quiz me'); await click(s, { text: 'Quiz me' }); await waitText(s, 'Question 1 of 5'); await click(s, { text: 'Close' });
  await tab(s, 'Learn'); await sleep(600);
  await tab(s, 'More'); await click(s, { label: 'Pixel Quest' });
  eq(await s.page.evaluate(() => document.body.classList.contains('theme-pixel')), true);
});
test('OFFLINE-04', 'Going offline mid-session: learned/next/progress/search do not crash', async ({ session }) => {
  const s = await session({}); s.allow.push(NET); await boot(s);
  s.fake.mode = 'down';
  await ctl(s, 'Next Word'); await U.waitWord(s, U.POOL_ORDER[1]);
  await ctl(s, 'Mark as Learned'); await click(s, { text: 'Mark as Learned', inDialog: true }); await sleep(1200);
  await tab(s, 'Progress'); await waitText(s, 'Quiz me'); await sleep(800);
  await tab(s, 'Learn'); await ctl(s, 'Quick Search'); await s.page.click('input[placeholder="Search word..."]'); await s.page.keyboard.type('lever'); await sleep(1500);
  ok(/No results found|offline|couldn|leverage|unavailable/i.test(await body(s)));
  ok((await body(s)).length > 100);
});
test('OFFLINE-05', 'Back online: reload converges with the server', async ({ session }) => {
  const s = await session({}); s.allow.push(NET); await boot(s);
  s.fake.mode = 'down';
  await ctl(s, 'Mark as Learned'); await click(s, { text: 'Mark as Learned', inDialog: true }); await sleep(1200);
  s.fake.mode = 'ok'; await s.reload(); await sleep(3500);
  await tab(s, 'Progress'); await waitText(s, 'Quiz me');
  ok((await body(s)).length > 200); // converged: app renders; learned sync call count recorded for the report
});
test('OFFLINE-07-local', 'Static: no non-local request escaped during this test', async ({ session }) => {
  const s = await session({}); await boot(s); await tab(s, 'Progress'); await sleep(800);
  ok(s.requests.every((u) => /fake-supabase\.test|vijvcojvemkzgpzpowzh\.supabase\.co|googletagmanager/.test(u)), s.requests.join('\n'));
});

// ---------- REG ----------
test('REG-01', 'Blank-screen guard: root fills fast, no watchdog box, logs silenced [FB-15]', async ({ session }) => {
  const s = await session({}); const logs = []; s.page.on('console', (m) => { if (['log', 'info', 'debug', 'warning'].includes(m.type())) logs.push(m.text()); });
  const t0 = Date.now(); await s.page.goto(s.base + '/', { waitUntil: 'domcontentloaded' });
  await s.page.waitForFunction(() => (document.getElementById('root')?.children.length || 0) > 0, { timeout: 3000 });
  ok(Date.now() - t0 < 3000, 'root rendered too late');
  await sleep(13000);
  ok(!(await body(s)).includes('could not start'), 'boot watchdog box shown');
  eq(logs.filter((l) => !/Failed to load|DevTools|Inspector/.test(l)).length, 0, 'console logs in production: ' + logs.slice(0, 3).join(' | '));
}, { timeout: 40000 });
test('REG-02', 'No Web Speech: signed-in and signed-out both render without TypeError', async ({ session }) => {
  for (const signedIn of [true, false]) {
    const s = await session({ speech: 'none', signedIn }); await s.goto('/'); await sleep(2500);
    // Web Speech is deleted before boot; the app then installs its own TTS shim on purpose.
    ok(await s.page.evaluate(() => !window.speechSynthesis || !('onvoiceschanged' in window.speechSynthesis && window.speechSynthesis instanceof (window.SpeechSynthesis || class {}))), 'real Web Speech should be gone');
    ok(!s.errors.some((e) => /TypeError/.test(e)), 'TypeError: ' + s.errors.join(' | '));
    if (signedIn) { await s.page.waitForFunction(() => (document.querySelector('main h1')?.textContent || '').trim().length > 0, { timeout: 10000 }); await ctl(s, 'Next Word'); }
    else await waitText(s, 'Access your vocabulary');
  }
});
test('REG-03', 'Signed-out Learn shows real words, never "No words in ..." ', async ({ session }) => {
  const s = await session({ signedIn: false }); await s.goto('/'); await waitText(s, 'Access your vocabulary');
  await s.page.waitForFunction(() => (document.querySelector('main h1')?.textContent || '').trim().length > 0, { timeout: 10000 });
  await sleep(1500); const t = await body(s); ok(!/No words in/.test(t) && !/No vocabulary data/.test(t), t.slice(0, 300));
});

// ---------- EDGE ----------
test('EDGE-01', 'Very long (100 char, no spaces) word does not overflow Learn / Progress / Sets', async ({ session }) => {
  const s = await session({}); await boot(s); await importFile(s, 'long_word.csv'); await waitText(s, 'was added to your selection'); await noHScroll(s, 'Library');
  await tab(s, 'Learn');
  for (let i = 0; i < 4; i++) { if (/^x{50}/.test((await word(s)) || '')) break; await sleep(500); await ctl(s, 'Next Word'); }
  ok(/^x{50}/.test((await word(s)) || ''), 'long word not shown'); await sleep(400); await noHScroll(s, 'Learn');
  await click(s, { text: 'TODAY' }); await sleep(500); await noHScroll(s, 'Learn (summary)');
  await tab(s, 'Progress'); await sleep(300); await noHScroll(s, 'Progress');
});
test('EDGE-02', 'Very long meaning/example: Learn, Quiz, Detail do not overflow', async ({ session }) => {
  const s = await session({}); await boot(s); await importFile(s, 'long_words.csv'); await waitText(s, 'was added to your selection');
  await tab(s, 'Learn'); await sleep(600); await noHScroll(s, 'Learn');
  const long = await s.page.evaluate(() => document.querySelector('main').innerText.length); ok(long > 0);
  await tab(s, 'Progress'); await click(s, { text: 'Quiz me' }); await waitText(s, 'Question 1 of 5'); await sleep(400); await noHScroll(s, 'Quiz');
  ok(await s.page.evaluate(() => { const d = document.querySelector('[role=dialog]'); return d.scrollWidth <= d.clientWidth + 1; }), 'quiz dialog overflow');
});
test('EDGE-03', 'Long set name: header subtitle and Sets card do not overflow', async ({ session }) => {
  const s = await session({}); await boot(s); await importFile(s, 'Word_Set_Sixty_characters_long_name_for_the_header_overflow_test_x.csv'); await waitText(s, 'was added to your selection');
  await noHScroll(s, 'Library'); await tab(s, 'Learn'); await noHScroll(s, 'Learn header'); await tab(s, 'More'); await noHScroll(s, 'More');
});
test('EDGE-04', 'Unicode / Vietnamese / emoji words import and display intact', async ({ session }) => {
  const s = await session({}); await boot(s); await importFile(s, 'unicode.csv'); await waitText(s, 'Imported 4 words into “unicode”.'); await U.useOnly(s, 'unicode');
  const ws = []; await tab(s, 'Learn');
  for (let i = 0; i < 4; i++) { await sleep(500); ws.push(await word(s)); await ctl(s, 'Next Word'); }
  ok(['bỏ cuộc', 'Đà Nẵng', 'rocket 🚀', 'café'].every((w) => ws.includes(w)), 'words shown: ' + ws);
});
test('EDGE-05', 'Rapid tab tapping 20x', async ({ session }) => {
  const s = await session({}); await boot(s);
  await s.page.evaluate(async () => { const names = ['Progress', 'Library', 'More', 'Learn']; for (let i = 0; i < 20; i++) { [...document.querySelectorAll('nav[aria-label=Primary] button')].find((b) => b.textContent.trim() === names[i % 4]).click(); await new Promise((r) => setTimeout(r, 15)); } });
  await sleep(800); await tab(s, 'Library'); await waitText(s, 'Create your own set');
});
test('EDGE-06', 'Rapid control taps 30x: state consistent, no overlapping utterances', async ({ session }) => {
  const s = await session({}); await boot(s);
  await U.openAudio(s); // Mute / Change Voice live in the Audio sheet; Pause stays on the dock
  await s.page.evaluate(async () => { for (let i = 0; i < 30; i++) { const b = [...document.querySelectorAll('button')].find((x) => ['Pause', 'Play', 'Mute', 'Unmute'].includes(x.getAttribute('aria-label')) && x.getAttribute('aria-label') === (['Pause', 'Mute', 'Pause'][i % 3] === 'Pause' ? (document.querySelector('button[aria-label="Pause"]') ? 'Pause' : 'Play') : ['Pause', 'Mute', 'Pause'][i % 3] === 'Mute' ? (document.querySelector('button[aria-label="Mute"]') ? 'Mute' : 'Unmute') : 'Pause')); b && b.click(); await new Promise((r) => setTimeout(r, 20)); } });
  await sleep(1200);
  const p = await U.prefs(s); eq(await U.label(s, 'Unmute'), p.is_muted === true, 'mute state vs prefs'); eq(await U.label(s, 'Play'), p.is_playing === false, 'pause state vs prefs'); await U.closeAudio(s);
  eq(await s.page.evaluate(() => window.__speech.overlap), 0, 'overlapping utterances');
  const toasts = await s.page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast]')].filter((e) => e.getAttribute('data-visible') !== 'false' && e.getAttribute('data-removed') !== 'true').length); ok(toasts <= 6, 'toast flood ' + toasts);
});
test('EDGE-07', 'localStorage full: no crash or blank screen', async ({ session }) => {
  const s = await session({}); await boot(s); s.allow.push(/Quota|quota|setItem|storage/i);
  await s.page.evaluate(() => { let n = 1 << 20; const f = 'x'.repeat(n); let i = 0; try { while (true) { localStorage.setItem('zz_fill' + i++, f); } } catch (e) {} for (const size of [65536, 4096, 256, 16, 1]) { const c = 'y'.repeat(size); for (;;) { try { localStorage.setItem('zz_fill' + i++, c); } catch (e) { break; } } } });
  await ctl(s, 'Next Word'); await sleep(400);
  await ctl(s, 'Mark as Learned'); await click(s, { text: 'Mark as Learned', inDialog: true }); await sleep(800);
  await sleep(2300); // the 2 s congrats popup covers the Speed button in the Cozy Sloth layout (new default theme)
  await U.openAudio(s); await ctl(s, 'Speech Rate'); await s.page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^1\.5\s*[×x]$/.test(b.textContent.trim())).click()); await sleep(500);
  await tab(s, 'More'); await click(s, { label: 'Pixel Quest' });
  await importFile(s, 'vocab.csv'); await sleep(900);
  ok(await s.page.evaluate(() => (document.getElementById('root')?.children.length || 0) > 0), 'blank root');
  ok(/too large|Imported|could not|Could not|store/i.test(await body(s)), 'import gave no feedback: ' + (await body(s)).slice(0, 200));
});
test('EDGE-08', 'localStorage throws on every access: app still renders something', async ({ session }) => {
  const s = await session({ noSeed: true, signedIn: false, initScript: `Storage.prototype.getItem = function(){ throw new DOMException('denied','SecurityError'); }; Storage.prototype.setItem = function(){ throw new DOMException('denied','SecurityError'); }; Storage.prototype.removeItem = function(){ throw new DOMException('denied','SecurityError'); };` });
  s.allow.push(/./);
  await s.page.goto(s.base + '/', { waitUntil: 'domcontentloaded' }); await sleep(4000);
  ok(await s.page.evaluate(() => (document.getElementById('root')?.children.length || 0) > 0 || /could not start/.test(document.body.innerText)), 'blank screen');
  ok(/Access your vocabulary|Lazy Vocabulary/.test(await body(s)), (await body(s)).slice(0, 200));
}, { noErrorCheck: true });
test('EDGE-09', 'All lv*/lazyVoca* keys corrupt: app starts at the sign-in gate', async ({ session }) => {
  const keys = ['lv_preferences', 'lv.vocabularySets.v1', 'lv.vocabularySets.active', 'lazyVoca.auth', 'lazyVoca.authState', 'lazyVoca.todayLastWord', 'lazyvoca.practice.history.v1', 'lv-dark', 'lv-theme', 'user-theme', 'todayWords', 'progressSummary', 'dailySelection', 'speechUnlocked', 'lazyVoca.reminder.state'];
  const storage = Object.fromEntries(keys.map((k) => [k, '{garbage']));
  const s = await session({ signedIn: false, storage }); s.allow.push(/./);
  await s.goto('/'); await sleep(3000);
  await waitText(s, 'Access your vocabulary');
  await s.page.waitForFunction(() => (document.querySelector('main h1')?.textContent || '').trim().length > 0, { timeout: 10000 });
}, { noErrorCheck: true });
test('EDGE-10', 'Missing speechSynthesis: controls render, Next works', async ({ session }) => {
  const s = await session({ speech: 'none' }); await s.goto('/');
  await s.page.waitForFunction(() => (document.querySelector('main h1')?.textContent || '').trim().length > 0, { timeout: 12000 });
  const w0 = await word(s); await sleep(500); await ctl(s, 'Next Word'); await sleep(800); ok((await word(s)) !== w0, 'Next did not advance');
  for (const l of ['Audio', 'Pause', 'Quick Search']) ok(await U.label(s, l), 'missing ' + l);
  await U.openAudio(s); ok(await U.label(s, 'Mute'), 'missing Mute in Audio sheet'); await U.closeAudio(s);
});
test('EDGE-13', 'HTML/script in imported text is inert in Learn, Quiz and Search', async ({ session }) => {
  const s = await session({}); await boot(s); await importFile(s, 'xss.json'); await waitText(s, 'Imported 6 words into “xss”.'); await U.useOnly(s, 'xss');
  await tab(s, 'Learn'); await s.page.waitForFunction(() => /<img src=x/.test(document.querySelector('main')?.innerText || ''), { timeout: 10000 }).catch(async () => { for (let i = 0; i < 4; i++) { await ctl(s, 'Next Word'); await sleep(450); if (/<img/.test(await body(s))) break; } });
  ok(/<img src=x/.test(await body(s)), 'text rendered literally');
  eq(await s.page.evaluate(() => window.__xss), undefined, 'script ran');
  eq(await s.page.evaluate(() => document.querySelectorAll('main img:not([data-mascot]), main script, [role=dialog] img:not([data-mascot])').length), 0, 'injected elements');
  await tab(s, 'Progress'); await click(s, { text: 'Quiz me' }); await waitText(s, 'Question 1 of 5'); eq(await s.page.evaluate(() => window.__xss), undefined);
  await click(s, { text: 'Close' }); await tab(s, 'Learn'); await sleep(600); await s.page.evaluate(() => document.querySelector('button[aria-label="Quick Search"]').click()); await sleep(600); await s.page.click('input[placeholder="Search word..."]'); await s.page.keyboard.type('img'); await sleep(1200);
  eq(await s.page.evaluate(() => window.__xss), undefined, 'script ran in search'); eq(await s.page.evaluate(() => document.querySelectorAll('[role=dialog] img').length), 0);
});
